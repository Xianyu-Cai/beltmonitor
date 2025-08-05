"""
Pydantic models for WebSocket detection payloads
"""

from pydantic import BaseModel
from typing import List
import time


class BoundingBox(BaseModel):
    """Single bounding box detection result"""
    cls: str
    conf: float
    x: int
    y: int
    w: int
    h: int


class DetectionPayload(BaseModel):
    """WebSocket payload for detection results"""
    ts: float
    camera_id: int
    boxes: List[BoundingBox]
    
    @classmethod
    def create_from_detections(cls, camera_id: int, results, class_names: dict):
        """
        Create payload from YOLO detection results
        
        Args:
            camera_id: Camera ID
            results: YOLO detection results
            class_names: Mapping of class IDs to names
        """
        boxes = []
        timestamp = time.time()
        
        for result in results:
            if hasattr(result, 'boxes') and result.boxes is not None:
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    
                    # Handle both torch tensors (real YOLO) and lists (mock data)
                    xyxy = box.xyxy[0]
                    if hasattr(xyxy, 'tolist'):
                        # It's a torch tensor
                        x1, y1, x2, y2 = map(int, xyxy.tolist())
                    else:
                        # It's already a list
                        x1, y1, x2, y2 = map(int, xyxy)
                    
                    boxes.append(BoundingBox(
                        cls=class_names.get(cls_id, f"class_{cls_id}"),
                        conf=confidence,
                        x=x1,
                        y=y1,
                        w=x2 - x1,
                        h=y2 - y1
                    ))
        
        return cls(
            ts=timestamp,
            camera_id=camera_id,
            boxes=boxes
        )
