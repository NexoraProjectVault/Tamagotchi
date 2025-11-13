from queue import Queue
import threading
from datetime import datetime
from typing import Callable, Dict, List

class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_queue = Queue()
        self.running = False
        self.thread = None
        self.lock = threading.Lock()

    def subscribe(self, event_type: str, callback: Callable):
        with self.lock:
            if event_type not in self.subscribers:
                self.subscribers[event_type] = []
            self.subscribers[event_type].append(callback)

    def publish(self, event_type: str, data: dict):
        event = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        self.event_queue.put(event)

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()
            print("✅ EventBus started")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("❌ EventBus stopped")

    def _run(self):
        while self.running:
            try:
                event = self.event_queue.get(timeout=1)
                self._dispatch_event(event)
            except:
                continue

    def _dispatch_event(self, event: dict):
        event_type = event['type']
        with self.lock:
            callbacks = self.subscribers.get(event_type, [])
        for cb in callbacks:
            try:
                cb(event)
            except Exception as e:
                print(f"Error in event callback: {e}")

# Global instance
event_bus = EventBus()
