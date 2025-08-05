"""
Simple WebSocket server for real-time detection results
Uses websockets library instead of FastAPI for lighter dependencies
"""

import asyncio
import json
import logging
import threading
from typing import Dict, Set
import websockets
from ws_models import DetectionPayload

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimpleConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set] = {}
        self.message_queues: Dict[int, asyncio.Queue] = {}
        
    async def register(self, websocket, camera_id: int):
        """Register a new WebSocket connection"""
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = set()
            self.message_queues[camera_id] = asyncio.Queue(maxsize=10)
            
        self.active_connections[camera_id].add(websocket)
        logger.info(f"Client connected to camera {camera_id}. Active connections: {len(self.active_connections[camera_id])}")
        
    def unregister(self, websocket, camera_id: int):
        """Unregister a WebSocket connection"""
        if camera_id in self.active_connections:
            self.active_connections[camera_id].discard(websocket)
            logger.info(f"Client disconnected from camera {camera_id}. Active connections: {len(self.active_connections[camera_id])}")
            
            # Clean up empty camera connections
            if not self.active_connections[camera_id]:
                del self.active_connections[camera_id]
                if camera_id in self.message_queues:
                    del self.message_queues[camera_id]
                    
    async def broadcast_to_camera(self, camera_id: int, message: str):
        """Broadcast message to all clients connected to a camera (non-blocking)"""
        if camera_id not in self.active_connections:
            return
            
        # Non-blocking send - drop message if queue is full
        try:
            queue = self.message_queues[camera_id]
            queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning(f"Message queue full for camera {camera_id}, dropping message")


manager = SimpleConnectionManager()


async def handle_client(websocket):
    """Handle WebSocket client connections"""
    try:
        # Get path from websocket
        path = websocket.path
        
        # Parse camera_id from path: /ws/boxes/{camera_id}
        path_parts = path.strip('/').split('/')
        if len(path_parts) < 3 or path_parts[0] != 'ws' or path_parts[1] != 'boxes':
            await websocket.close(code=1003, reason="Invalid path")
            return
            
        try:
            camera_id = int(path_parts[2])
        except ValueError:
            await websocket.close(code=1003, reason="Invalid camera_id")
            return
            
        await manager.register(websocket, camera_id)
        
        # Process message queue for this camera
        queue = manager.message_queues.get(camera_id)
        if queue:
            while True:
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(queue.get(), timeout=1.0)
                    
                    # Send to this client
                    await websocket.send(message)
                    
                except asyncio.TimeoutError:
                    # Keep connection alive
                    continue
                except Exception as e:
                    logger.error(f"Error sending message to client: {e}")
                    break
                    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if 'camera_id' in locals():
            manager.unregister(websocket, camera_id)


async def send_detection_payload(camera_id: int, payload: DetectionPayload):
    """
    Send detection payload to WebSocket clients (non-blocking)
    Called from the video processing pipeline
    """
    try:
        message = payload.model_dump_json()
        await manager.broadcast_to_camera(camera_id, message)
    except Exception as e:
        logger.error(f"Error sending detection payload for camera {camera_id}: {e}")


def start_websocket_server(host: str = "0.0.0.0", port: int = 8001):
    """Start the WebSocket server"""
    logger.info(f"Starting WebSocket server on ws://{host}:{port}")
    
    # Create new event loop for this thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Create server with explicit loop
        start_server = websockets.serve(handle_client, host, port)
        loop.run_until_complete(start_server)
        loop.run_forever()
    except Exception as e:
        logger.error(f"Error in WebSocket server: {e}")
    finally:
        loop.close()


def start_server_thread(host: str = "0.0.0.0", port: int = 8001):
    """Start WebSocket server in a separate thread"""
    thread = threading.Thread(target=start_websocket_server, args=(host, port), daemon=True)
    thread.start()
    return thread


if __name__ == "__main__":
    start_websocket_server()
