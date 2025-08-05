"""
WebSocket producer for sending detection results
Integrates with the main video processing pipeline
"""

import asyncio
import threading
from ws_models import DetectionPayload
from ws_server import send_detection_payload, start_server_thread
import logging

logger = logging.getLogger(__name__)


class DetectionProducer:
    """Producer for sending detection results via WebSocket"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8001):
        self.host = host
        self.port = port
        self.loop = None
        self.thread = None
        self.server_thread = None
        self._running = False
        
    def start(self):
        """Start the WebSocket server and async event loop"""
        if self._running:
            return
            
        self._running = True
        
        # Start WebSocket server in separate thread
        self.server_thread = start_server_thread(self.host, self.port)
        
        # Start async loop for handling detection payloads
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        
        # Wait for loop to be ready
        while self.loop is None:
            threading.Event().wait(0.01)
            
        logger.info(f"Detection producer started on ws://{self.host}:{self.port}")
        
    def stop(self):
        """Stop the producer"""
        self._running = False
        if self.loop and not self.loop.is_closed():
            try:
                future = asyncio.run_coroutine_threadsafe(self._stop_loop(), self.loop)
                future.result(timeout=1.0)
            except Exception as e:
                logger.error(f"Error stopping loop: {e}")
        if self.thread:
            self.thread.join(timeout=1.0)
            
    def _run_loop(self):
        """Run the asyncio event loop"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        try:
            self.loop.run_forever()
        except Exception as e:
            logger.error(f"Error in producer loop: {e}")
        finally:
            self.loop.close()
            
    async def _stop_loop(self):
        """Stop the event loop"""
        if self.loop:
            self.loop.stop()
        
    def send_detections(self, camera_id: int, results, class_names: dict):
        """
        Send detection results via WebSocket (non-blocking)
        
        Args:
            camera_id: Camera ID
            results: YOLO detection results
            class_names: Mapping of class IDs to names
        """
        if not self._running or not self.loop:
            return
            
        try:
            payload = DetectionPayload.create_from_detections(camera_id, results, class_names)
            
            # Schedule the coroutine in the event loop (non-blocking)
            future = asyncio.run_coroutine_threadsafe(
                send_detection_payload(camera_id, payload), 
                self.loop
            )
            
            # Don't wait for completion to keep pipeline non-blocking
            
        except Exception as e:
            logger.error(f"Error creating/sending detection payload: {e}")


# Global producer instance
detection_producer = DetectionProducer()
