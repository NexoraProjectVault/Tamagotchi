from flask import Blueprint, request, jsonify, Response
import requests
from config import Config
from event_bus import event_bus
from shared.event_client import Events
import json
from datetime import datetime
from queue import Queue


api_gateway = Blueprint('api_gateway', __name__, url_prefix='/v1')

# ============ GLOBAL EVENT BROADCAST ============
# Single shared queue for all SSE clients
_event_broadcast_queue = Queue()

def _setup_broadcast_subscription():
    """Set up the event bus subscription once at startup"""
    def broadcast_callback(event):
        # Put event in shared queue for all clients
        _event_broadcast_queue.put(event)
    
    # Subscribe to all event types with single callback
    for event_type in [Events.USER_CREATED, Events.USER_UPDATED,
                      Events.TASK_CREATED, Events.TASK_PENDING,
                      Events.TASK_COMPLETED, Events.PET_CREATED,
                      Events.PET_UPDATED, Events.TASK_UPDATED, 
                      Events.TASK_DELETED, Events.TASK_RESTORED]:
        event_bus.subscribe(event_type, broadcast_callback)
    
    print("✅ Broadcast subscription set up.")

# Set up broadcast subscription immediately on app creation
_setup_broadcast_subscription()

def generate_service_cards(services_status):
    cards = ""
    for service_name, status_info in services_status.items():
        status = status_info['status']
        url = status_info['url']
        details = status_info.get('details', {})
        
        display_name = service_name.replace('_', ' ').title()
        
        if status == 'healthy':
            status_text = '✅ Healthy'
            icon = '🟢'
        elif status == 'unhealthy':
            status_text = '⚠️ Unhealthy'
            icon = '🟡'
        else:
            status_text = '❌ Down'
            icon = '🔴'
        
        if isinstance(details, dict):
            details_text = details.get('status', details.get('message', 'No details'))
        else:
            details_text = str(details)
        
        cards += f"""
        <div class="service-card {status}">
            <div class="service-name">
                <span class="status-badge {status}"></span>
                {icon} {display_name}
            </div>
            <div class="service-url">🔗 {url}</div>
            <div class="status-text {status}">{status_text}</div>
            <div class="status-details">{details_text}</div>
        </div>
        """
    
    return cards

@api_gateway.route('/api_health', methods=['GET'])
def health():
    return jsonify({'status': 'API Gateway is running', 'service': 'api_gateway'}), 200

@api_gateway.route('/', methods=['GET'])
def index():
    return jsonify({'Note': 'specify endpoints'}), 200


@api_gateway.route('/events', methods=['POST'])
def receive_event():
    """
    Receive events from microservices and publish to event bus.
    
    Services POST here to emit events:
        POST /events
        {
            "type": "task_created",
            "data": {"task_id": ---, "title": "---"},
            "timestamp": "2025-01-15T10:30:00"
        }
    """
    try:
        data = request.json
        event_type = data.get('type')
        event_data = data.get('data')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        if not event_type or event_data is None:
            return {'error': 'Missing type or data'}, 400
        
        print(f"✅ Event received: {event_type}")
        
        # Create full event object
        event = {
            'type': event_type,
            'data': event_data,
            'timestamp': timestamp
        }
        
        # Publish to internal event bus (triggers broadcast_callback)
        event_bus.publish(event_type, event)
        
        return {'status': 'received', 'type': event_type}, 202
    
    except Exception as e:
        print(f"❌ Error receiving event: {e}")
        return {'error': str(e)}, 500


@api_gateway.route('/events', methods=['GET'])
def events_stream():
    """
    SSE endpoint for frontend to receive real-time events.
    All clients share the same broadcast queue.
    
    Frontend usage:
        const eventSource = new EventSource('/events');
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
        };
    """
    def generate():
        print("🔌 New SSE client connected")
        
        while True:
            try:
                # Get events from shared broadcast queue (all clients share this)
                # Use a short timeout for frequent heartbeats
                event = _event_broadcast_queue.get(timeout=5)
                print(f"Broadcasting event to all clients: {event.get('type')}")
                yield f"data: {json.dumps(event)}\n\n"
            except:
                # Send heartbeat every 5 seconds to keep connection alive
                try:
                    yield f": heartbeat\n\n"
                except GeneratorExit:
                    print("🔌 SSE client disconnected")
                    break
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'chunked'
        }
    )

@api_gateway.route('/health', methods=['GET'])
def dashboard():
    services_status = {
        'user_service': check_service_health(Config.USER_SERVICE_URL),
        'pet_service': check_service_health(Config.PET_SERVICE_URL),
        'task_service': check_service_health(Config.TASK_SERVICE_URL)
    }
    
    return render_dashboard(services_status), 200

def check_service_health(service_url):
    try:
        response = requests.get(f'{service_url}/api/v1/health', timeout=3)
        if response.status_code == 200:
            return {'status': 'healthy', 'url': service_url, 'details': response.json()}
        else:
            return {'status': 'unhealthy', 'url': service_url, 'details': 'Bad status code'}
    except Exception as e:
        return {'status': 'down', 'url': service_url, 'details': str(e)}


@api_gateway.route('/user-service/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_users(endpoint):
    """Forward user service requests"""
    return proxy_request(Config.USER_SERVICE_URL, endpoint, service_type='user')

@api_gateway.route('/pet-service/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_pets(endpoint):
    """Forward pet service requests"""
    return proxy_request(Config.PET_SERVICE_URL, endpoint, service_type='pet')

@api_gateway.route('/task-service/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_tasks(endpoint):
    """Forward task service requests"""
    return proxy_request(Config.TASK_SERVICE_URL, endpoint, service_type='task')


def proxy_request(service_url, endpoint, service_type='default'):
    """
    Generic proxy function to forward requests to microservices
    
    Args:
        service_url: Base URL of the target microservice
        endpoint: The endpoint path from the gateway route
        service_type: Type of service ('user', 'pet', 'task', etc.)
    """
    try:

        target_url = f'{service_url}/api/v1/{endpoint}'
        
        # Prepare request parameters
        headers = dict(request.headers)
        headers.pop('Host', None)

        # Get request body if it exists
        body = request.get_data() if request.method in ['POST', 'PUT', 'PATCH'] else None
        
        # Forward the request to the microservice
        if request.method == 'GET':
            response = requests.get(target_url, headers=headers, params=request.args, timeout=10)
        elif request.method == 'POST':
            response = requests.post(target_url, headers=headers, data=body, timeout=10)
        elif request.method == 'PUT':
            response = requests.put(target_url, headers=headers, data=body, timeout=10)
        elif request.method == 'DELETE':
            response = requests.delete(target_url, headers=headers, timeout=10)
        elif request.method == 'PATCH':
            response = requests.patch(target_url, headers=headers, data=body, timeout=10)
        
        print(f"✅  Proxied {request.method} {target_url} -> {response.status_code}")
        
        # Return the service response to the frontend
        return Response(
            response.content,
            status=response.status_code,
            headers=dict(response.headers)
        )
    
    except requests.exceptions.Timeout:
        print(f"Error = Service timeout: {service_url}")
        return jsonify({'error': 'Service timeout'}), 504
    except requests.exceptions.ConnectionError:
        print(f"Error = Cannot connect to service: {service_url}")
        return jsonify({'error': 'Service unavailable'}), 503
    except Exception as e:
        print(f"Error = Proxy error: {e}")
        return jsonify({'error': str(e)}), 500
    


def render_dashboard(services_status):
    cards_html = generate_service_cards(services_status)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Gateway - Health Dashboard</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }}
            
            .container {{
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 40px;
                max-width: 800px;
                width: 100%;
            }}
            
            h1 {{
                color: #333;
                margin-bottom: 10px;
                font-size: 2.5em;
                text-align: center;
            }}
            
            .subtitle {{
                text-align: center;
                color: #666;
                margin-bottom: 40px;
                font-size: 1.1em;
            }}
            
            .services-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }}
            
            .service-card {{
                border-radius: 15px;
                padding: 25px;
                border-left: 5px solid;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }}
            
            .service-card:hover {{
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }}
            
            .service-card.healthy {{
                border-left-color: #10b981;
                background: linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%);
            }}
            
            .service-card.unhealthy {{
                border-left-color: #f59e0b;
                background: linear-gradient(135deg, #fffbf0 0%, #fffbf0 100%);
            }}
            
            .service-card.down {{
                border-left-color: #ef4444;
                background: linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%);
            }}
            
            .service-name {{
                font-size: 1.3em;
                font-weight: 600;
                margin-bottom: 10px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            .status-badge {{
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }}
            
            .status-badge.healthy {{
                background-color: #10b981;
            }}
            
            .status-badge.unhealthy {{
                background-color: #f59e0b;
            }}
            
            .status-badge.down {{
                background-color: #ef4444;
            }}
            
            @keyframes pulse {{
                0%, 100% {{
                    opacity: 1;
                }}
                50% {{
                    opacity: 0.5;
                }}
            }}
            
            .service-url {{
                font-size: 0.9em;
                color: #666;
                margin-bottom: 10px;
                word-break: break-all;
            }}
            
            .status-text {{
                font-weight: 600;
                font-size: 1.1em;
                margin-bottom: 8px;
            }}
            
            .status-text.healthy {{
                color: #10b981;
            }}
            
            .status-text.unhealthy {{
                color: #f59e0b;
            }}
            
            .status-text.down {{
                color: #ef4444;
            }}
            
            .status-details {{
                font-size: 0.85em;
                color: #999;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }}
            
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #999;
                font-size: 0.9em;
            }}
            
            .api-info {{
                background: #f3f4f6;
                border-radius: 10px;
                padding: 20px;
                margin-top: 30px;
            }}
            
            .api-info h2 {{
                color: #333;
                margin-bottom: 15px;
                font-size: 1.3em;
            }}
            
            .api-link {{
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                text-decoration: none;
                margin-right: 10px;
                margin-bottom: 10px;
                transition: background 0.3s ease;
            }}
            
            .api-link:hover {{
                background: #764ba2;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 API Gateway</h1>
            <p class="subtitle">Health Dashboard</p>
            
            <div class="services-grid">
                {cards_html}
            </div>
            
            <div class="api-info">
                <h2>📚 API Documentation</h2>
                <a class="api-link" href="http://localhost:5173" target="_blank">Frontend</a>
            </div>
            
            <div class="footer">
                <p>Last updated: {timestamp}</p>
                <p>All services running on Docker microservices architecture</p>
            </div>
        </div>
    </body>
    </html>
    """