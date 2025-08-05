"""
Test file for WebSocket detection box system
"""

import pytest
import asyncio
import json
import time
from unittest.mock import MagicMock
from ws_models import BoundingBox, DetectionPayload
from ws_server import send_detection_payload, SimpleConnectionManager


class TestWebSocketDetectionSystem:
    """Test suite for the WebSocket detection system"""
    
    def test_bounding_box_serialization(self):
        """Test BoundingBox model serialization"""
        box = BoundingBox(
            cls="person",
            conf=0.85,
            x=100,
            y=200, 
            w=50,
            h=80
        )
        
        # Test JSON serialization
        json_data = box.model_dump()
        expected = {
            "cls": "person",
            "conf": 0.85,
            "x": 100,
            "y": 200,
            "w": 50,
            "h": 80
        }
        assert json_data == expected
        
    def test_detection_payload_serialization(self):
        """Test DetectionPayload serialization with multiple boxes"""
        boxes = [
            BoundingBox(cls="person", conf=0.85, x=100, y=200, w=50, h=80),
            BoundingBox(cls="大块", conf=0.92, x=300, y=150, w=120, h=60)
        ]
        
        timestamp = time.time()
        payload = DetectionPayload(
            ts=timestamp,
            camera_id=1,
            boxes=boxes
        )
        
        # Test JSON serialization
        json_str = payload.model_dump_json()
        data = json.loads(json_str)
        
        assert data["camera_id"] == 1
        assert data["ts"] == timestamp
        assert len(data["boxes"]) == 2
        assert data["boxes"][0]["cls"] == "person"
        assert data["boxes"][1]["cls"] == "大块"
        
    def test_detection_payload_from_mock_yolo(self):
        """Test creating DetectionPayload from mock YOLO results"""
        
        # Mock YOLO detection results
        class MockBox:
            def __init__(self, cls_id, confidence, x1, y1, x2, y2):
                self.cls = [cls_id]
                self.conf = [confidence]
                self.xyxy = [[x1, y1, x2, y2]]
                
        class MockResult:
            def __init__(self, boxes):
                self.boxes = boxes
        
        mock_boxes = [
            MockBox(cls_id=6, confidence=0.85, x1=100, y1=200, x2=150, y2=280),
            MockBox(cls_id=2, confidence=0.92, x1=300, y1=150, x2=420, y2=210)
        ]
        mock_results = [MockResult(mock_boxes)]
        
        class_names = {
            2: "大块", 
            6: "人员"
        }
        
        # Create payload from mock YOLO results
        payload = DetectionPayload.create_from_detections(
            camera_id=1,
            results=mock_results,
            class_names=class_names
        )
        
        assert payload.camera_id == 1
        assert len(payload.boxes) == 2
        
        # Check first box (人员)
        box1 = payload.boxes[0]
        assert box1.cls == "人员"
        assert box1.conf == 0.85
        assert box1.x == 100
        assert box1.y == 200
        assert box1.w == 50  # x2 - x1
        assert box1.h == 80  # y2 - y1
        
        # Check second box (大块)
        box2 = payload.boxes[1]
        assert box2.cls == "大块"
        assert box2.conf == 0.92
        assert box2.x == 300
        assert box2.y == 150
        assert box2.w == 120  # x2 - x1  
        assert box2.h == 60   # y2 - y1
        
    def test_empty_detection_results(self):
        """Test handling empty detection results"""
        mock_results = []
        class_names = {2: "大块", 6: "人员"}
        
        payload = DetectionPayload.create_from_detections(
            camera_id=1,
            results=mock_results, 
            class_names=class_names
        )
        
        assert payload.camera_id == 1
        assert len(payload.boxes) == 0
        assert isinstance(payload.ts, float)
        
    def test_unknown_class_handling(self):
        """Test handling of unknown class IDs"""
        
        class MockBox:
            def __init__(self, cls_id, confidence, x1, y1, x2, y2):
                self.cls = [cls_id]
                self.conf = [confidence]
                self.xyxy = [[x1, y1, x2, y2]]
                
        class MockResult:
            def __init__(self, boxes):
                self.boxes = boxes
        
        mock_boxes = [
            MockBox(cls_id=99, confidence=0.75, x1=50, y1=60, x2=100, y2=120)
        ]
        mock_results = [MockResult(mock_boxes)]
        
        class_names = {
            2: "大块",
            6: "人员"
        }
        
        payload = DetectionPayload.create_from_detections(
            camera_id=1,
            results=mock_results,
            class_names=class_names
        )
        
        assert len(payload.boxes) == 1
        box = payload.boxes[0]
        assert box.cls == "class_99"  # Unknown class should use default naming
        assert box.conf == 0.75
        
    @pytest.mark.asyncio
    async def test_connection_manager(self):
        """Test SimpleConnectionManager basic functionality"""
        manager = SimpleConnectionManager()
        
        # Mock websocket
        mock_websocket = MagicMock()
        camera_id = 1
        
        # Test registration
        await manager.register(mock_websocket, camera_id)
        assert camera_id in manager.active_connections
        assert mock_websocket in manager.active_connections[camera_id]
        assert camera_id in manager.message_queues
        
        # Test message broadcasting
        test_message = "test message"
        await manager.broadcast_to_camera(camera_id, test_message)
        
        # Check that message was queued
        queue = manager.message_queues[camera_id]
        assert not queue.empty()
        
        # Test unregistration
        manager.unregister(mock_websocket, camera_id)
        assert camera_id not in manager.active_connections
        assert camera_id not in manager.message_queues
        
    def test_json_schema_validation(self):
        """Test that the JSON schema matches expected format"""
        
        # Create a sample payload
        boxes = [
            BoundingBox(cls="person", conf=0.85, x=100, y=200, w=50, h=80)
        ]
        
        payload = DetectionPayload(
            ts=1234567890.123,
            camera_id=1,
            boxes=boxes
        )
        
        # Get JSON
        json_str = payload.model_dump_json()
        data = json.loads(json_str)
        
        # Validate schema structure
        required_fields = ["ts", "camera_id", "boxes"]
        for field in required_fields:
            assert field in data
            
        # Validate box structure
        box_data = data["boxes"][0]
        required_box_fields = ["cls", "conf", "x", "y", "w", "h"]
        for field in required_box_fields:
            assert field in box_data
            
        # Validate data types
        assert isinstance(data["ts"], float)
        assert isinstance(data["camera_id"], int)
        assert isinstance(data["boxes"], list)
        assert isinstance(box_data["cls"], str)
        assert isinstance(box_data["conf"], float)
        assert isinstance(box_data["x"], int)
        assert isinstance(box_data["y"], int)
        assert isinstance(box_data["w"], int)
        assert isinstance(box_data["h"], int)
