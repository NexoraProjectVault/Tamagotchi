import requests
import os
import json
from datetime import datetime
from typing import Dict, Optional

class Events:
    """Event type constants"""
    USER_CREATED = 'user_created'
    USER_UPDATED = 'user_updated'
    TASK_CREATED = 'task_created'
    TASK_PENDING = 'task_pending'
    TASK_COMPLETED = 'task_completed'
    PET_CREATED = 'pet_created'
    PET_UPDATED = 'pet_updated'
    TASK_DELETED = 'task_deleted'
    TASK_RESTORED = 'task_restored'
    TASK_UPDATED = 'task_updated'
    ROADMAP_CREATED = 'roadmap_created'
    ROADMAP_UPDATED = 'roadmap_updated'
    ROADMAP_DELETED = 'roadmap_deleted'



class EventClient:
    """
    Client for sending events to the API Gateway.
    Use this in any microservice container to emit events.
    
    Usage:
        from event_client import EventClient, Events
        
        client = EventClient()
        client.emit(Events.USER_CREATED, {'user_id': 123, 'name': 'John'})
    """
    
    def __init__(self, api_gateway_url: Optional[str] = None):
        """
        Initialize event client.
        
        Args:
            api_gateway_url: Full URL to API gateway (e.g., 'http://api_gateway:5000').
                           If None, uses environment variables.
        """
        if api_gateway_url:
            self.url = api_gateway_url.rstrip('/')
        else:
            host = os.getenv('API_GATEWAY_HOST', 'api_gateway')
            port = os.getenv('API_GATEWAY_PORT', '5000')
            self.url = f'http://{host}:{port}'
        
        self.events_endpoint = f'{self.url}/events'
        self.timeout = int(os.getenv('EVENT_CLIENT_TIMEOUT', '5'))
    
    def emit(self, event_type: str, data: Dict, wait_response: bool = False) -> bool:
        """
        Send an event to the API Gateway.
        
        Args:
            event_type: Type of event (use Events constants)
            data: Event data as dictionary
            wait_response: If True, wait for response and return status
        
        Returns:
            True if successful, False otherwise
        """
        payload = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            if wait_response:
                response = requests.post(
                    self.events_endpoint,
                    json=payload,
                    timeout=self.timeout
                )
                if response.status_code in [200, 202]:
                    print(f"✅ Event emitted: {event_type}")
                    return True
                else:
                    print(f"⚠️  Event failed with status {response.status_code}: {event_type}")
                    return False
            else:
                # Fire and forget
                requests.post(
                    self.events_endpoint,
                    json=payload,
                    timeout=self.timeout
                )
                return True
        
        except requests.exceptions.Timeout:
            print(f"❌ Event timeout: {event_type}")
            return False
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to API Gateway at {self.events_endpoint}")
            return False
        except Exception as e:
            print(f"❌ Error emitting event {event_type}: {e}")
            return False


# Convenience instance for easy importing
event_client = EventClient()