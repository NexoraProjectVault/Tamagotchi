import threading
import time
import json
from queue import Queue
from datetime import datetime
from typing import Callable, Dict, List

class EventBus:
    """
    A thread-safe event bus that handles event publishing and subscription.
    Runs indefinitely in a separate thread.
    """
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_queue = Queue()
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
    
    def subscribe(self, event_type: str, callback: Callable):
        """Subscribe a callback to an event type"""
        with self.lock:
            if event_type not in self.subscribers:
                self.subscribers[event_type] = []
            self.subscribers[event_type].append(callback)
    
    def publish(self, event_type: str, data: dict):
        """Publish an event to the queue"""
        event = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        self.event_queue.put(event)
    
    def start(self):
        """Start the event bus in a background thread"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()
            print("✅ Event Bus started successfully")
    
    def stop(self):
        """Stop the event bus"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("❌ Event Bus stopped")
    
    def _run(self):
        """Main event bus loop - runs indefinitely"""
        while self.running:
            try:
                # Get event from queue with timeout
                event = self.event_queue.get(timeout=1)
                self._dispatch_event(event)
            except:
                # Queue timeout or empty, continue loop
                continue
    
    def _dispatch_event(self, event: dict):
        """Dispatch event to all subscribers of that event type"""
        event_type = event['type']
        
        with self.lock:
            callbacks = self.subscribers.get(event_type, [])
        
        # Call all subscribed callbacks
        for callback in callbacks:
            try:
                callback(event)
            except Exception as e:
                print(f"Error in event callback: {e}")

# Global event bus instance
event_bus = EventBus()

