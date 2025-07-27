"""
Core modules for AI detection system.
Lazy imports to avoid dependency issues during testing.
"""

# Note: Imports are done lazily to avoid dependency issues
__all__ = [
    'VideoProcessor',
    'YOLODetector', 
    'HLSStreamer',
    'AlarmProcessor',
    'CoalQuantityTracker',
    'DetectionEngine'
]

def get_video_processor():
    from .video_processor import VideoProcessor
    return VideoProcessor

def get_yolo_detector():
    from .yolo_detector import YOLODetector
    return YOLODetector

def get_hls_streamer():
    from .hls_streamer import HLSStreamer
    return HLSStreamer

def get_alarm_processor():
    from .alarm_processor import AlarmProcessor
    return AlarmProcessor

def get_coal_quantity_tracker():
    from .coal_quantity_tracker import CoalQuantityTracker
    return CoalQuantityTracker

def get_detection_engine():
    from .detection_engine import DetectionEngine
    return DetectionEngine