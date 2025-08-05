"""
FastAPI WebSocket server for real-time detection box broadcasting
"""

import asyncio
import json
import time
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from ws_models import DetectionPayload

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Detection Box WebSocket Server", version="1.0.0")

# 允许CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存储每个摄像头的WebSocket连接
camera_connections: Dict[int, Set[WebSocket]] = {}

# 存储待发送的消息队列（非阻塞队列）
message_queues: Dict[int, asyncio.Queue] = {}

# 队列最大大小 - 如果队列满了就丢弃消息
MAX_QUEUE_SIZE = 10


class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, camera_id: int):
        """添加新的WebSocket连接"""
        await websocket.accept()
        
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = set()
        
        self.active_connections[camera_id].add(websocket)
        logger.info(f"Client connected to camera {camera_id}. Total connections: {len(self.active_connections[camera_id])}")
        
    def disconnect(self, websocket: WebSocket, camera_id: int):
        """移除WebSocket连接"""
        if camera_id in self.active_connections:
            self.active_connections[camera_id].discard(websocket)
            if not self.active_connections[camera_id]:
                # 如果没有连接了，删除这个摄像头的连接集合
                del self.active_connections[camera_id]
        
        logger.info(f"Client disconnected from camera {camera_id}")
        
    async def broadcast_to_camera(self, camera_id: int, message: str):
        """向特定摄像头的所有连接广播消息（非阻塞）"""
        if camera_id not in self.active_connections:
            return
            
        connections = self.active_connections[camera_id].copy()
        dead_connections = []
        
        for connection in connections:
            try:
                # 非阻塞发送 - 如果连接繁忙则跳过
                await asyncio.wait_for(connection.send_text(message), timeout=0.001)
            except asyncio.TimeoutError:
                # 连接繁忙，跳过这次发送
                logger.debug(f"Connection to camera {camera_id} is busy, skipping message")
                continue
            except Exception as e:
                # 连接已断开
                logger.warning(f"Failed to send message to camera {camera_id}: {e}")
                dead_connections.append(connection)
        
        # 清理死连接
        for dead_conn in dead_connections:
            self.disconnect(dead_conn, camera_id)

    def get_connection_count(self, camera_id: int) -> int:
        """获取特定摄像头的连接数量"""
        return len(self.active_connections.get(camera_id, set()))


# 全局连接管理器
manager = ConnectionManager()


@app.websocket("/ws/boxes/{camera_id}")
async def websocket_endpoint(websocket: WebSocket, camera_id: int):
    """WebSocket端点：/ws/boxes/{camera_id}"""
    await manager.connect(websocket, camera_id)
    
    try:
        while True:
            # 保持连接活跃，等待客户端消息或断开连接
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, camera_id)
    except Exception as e:
        logger.error(f"WebSocket error for camera {camera_id}: {e}")
        manager.disconnect(websocket, camera_id)


async def broadcast_detection_payload(camera_id: int, payload: DetectionPayload):
    """
    广播检测负载到指定摄像头的所有WebSocket连接（非阻塞）
    
    Args:
        camera_id: 摄像头ID
        payload: 检测负载数据
    """
    if manager.get_connection_count(camera_id) == 0:
        # 没有客户端连接，直接返回
        return
    
    try:
        # 序列化为JSON
        message = payload.model_dump_json()
        
        # 非阻塞广播
        await manager.broadcast_to_camera(camera_id, message)
        
        logger.debug(f"Broadcasted detection payload to camera {camera_id}: {len(payload.boxes)} boxes")
        
    except Exception as e:
        logger.error(f"Failed to broadcast detection payload for camera {camera_id}: {e}")


def start_fastapi_server(host: str = "127.0.0.1", port: int = 8765, log_level: str = "info"):
    """启动FastAPI WebSocket服务器"""
    logger.info(f"Starting FastAPI WebSocket server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level=log_level)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "active_cameras": list(manager.active_connections.keys())}


@app.get("/stats")
async def get_stats():
    """获取服务器统计信息"""
    stats = {}
    total_connections = 0
    
    for camera_id, connections in manager.active_connections.items():
        count = len(connections)
        stats[f"camera_{camera_id}"] = count
        total_connections += count
    
    return {
        "total_connections": total_connections,
        "active_cameras": len(manager.active_connections),
        "connections_per_camera": stats
    }


if __name__ == "__main__":
    start_fastapi_server(host="0.0.0.0", port=8765)
