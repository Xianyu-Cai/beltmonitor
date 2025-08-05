"""
Unit tests for WebSocket detection models and functionality
"""

import pytest
import json
import time
from ws_models import BoundingBox, DetectionPayload


class MockBox:
    """Mock YOLO box for testing"""
    def __init__(self, cls_id, confidence, x1, y1, x2, y2):
        self.cls = [cls_id]
        self.conf = [confidence]
        self.xyxy = [[x1, y1, x2, y2]]


class MockResult:
    """Mock YOLO result for testing"""
    def __init__(self, boxes):
        self.boxes = boxes


def test_bounding_box_model():
    """Test BoundingBox model validation"""
    box = BoundingBox(
        cls="person",
        conf=0.85,
        x=100,
        y=200,
        w=50,
        h=80
    )
    
    assert box.cls == "person"
    assert box.conf == 0.85
    assert box.x == 100
    assert box.y == 200
    assert box.w == 50
    assert box.h == 80


def test_detection_payload_model():
    """Test DetectionPayload model validation"""
    timestamp = time.time()
    boxes = [
        BoundingBox(cls="person", conf=0.85, x=100, y=200, w=50, h=80),
        BoundingBox(cls="car", conf=0.92, x=300, y=150, w=120, h=60)
    ]
    
    payload = DetectionPayload(
        ts=timestamp,
        camera_id=1,
        boxes=boxes
    )
    
    assert payload.ts == timestamp
    assert payload.camera_id == 1
    assert len(payload.boxes) == 2
    assert payload.boxes[0].cls == "person"
    assert payload.boxes[1].cls == "car"


def test_detection_payload_json_serialization():
    """Test JSON serialization of DetectionPayload"""
    timestamp = 1625097600.0  # Fixed timestamp for reproducible test
    boxes = [
        BoundingBox(cls="person", conf=0.85, x=100, y=200, w=50, h=80)
    ]
    
    payload = DetectionPayload(
        ts=timestamp,
        camera_id=1,
        boxes=boxes
    )
    
    json_str = payload.model_dump_json()
    parsed = json.loads(json_str)
    
    expected_structure = {
        "ts": timestamp,
        "camera_id": 1,
        "boxes": [{
            "cls": "person",
            "conf": 0.85,
            "x": 100,
            "y": 200,
            "w": 50,
            "h": 80
        }]
    }
    
    assert parsed == expected_structure


def test_create_from_detections():
    """Test creating DetectionPayload from mock YOLO results"""
    # Create mock YOLO detection results
    mock_boxes = [
        MockBox(cls_id=6, confidence=0.85, x1=100, y1=200, x2=150, y2=280),
        MockBox(cls_id=2, confidence=0.92, x1=300, y1=150, x2=420, y2=210)
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
    
    assert payload.camera_id == 1
    assert len(payload.boxes) == 2
    assert payload.ts > 0  # Should have valid timestamp
    
    # Check first box (person)
    assert payload.boxes[0].cls == "人员"
    assert payload.boxes[0].conf == 0.85
    assert payload.boxes[0].x == 100
    assert payload.boxes[0].y == 200
    assert payload.boxes[0].w == 50  # x2 - x1 = 150 - 100
    assert payload.boxes[0].h == 80  # y2 - y1 = 280 - 200
    
    # Check second box (large block)
    assert payload.boxes[1].cls == "大块"
    assert payload.boxes[1].conf == 0.92
    assert payload.boxes[1].x == 300
    assert payload.boxes[1].y == 150
    assert payload.boxes[1].w == 120  # x2 - x1 = 420 - 300
    assert payload.boxes[1].h == 60   # y2 - y1 = 210 - 150


def test_empty_detection_results():
    """Test handling of empty detection results"""
    mock_results = [MockResult([])]  # Empty boxes
    
    payload = DetectionPayload.create_from_detections(
        camera_id=1,
        results=mock_results,
        class_names={}
    )
    
    assert payload.camera_id == 1
    assert len(payload.boxes) == 0
    assert payload.ts > 0


def test_unknown_class_handling():
    """Test handling of unknown class IDs"""
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
    assert payload.boxes[0].cls == "class_99"  # Fallback naming


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
