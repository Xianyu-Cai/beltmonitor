"""
Standalone inference server demonstration (NEW VERSION)
Shows the differences from the original pipeline
"""

import cv2
import time
import threading
from ultralytics import YOLO
from ws_producer import detection_producer

# Mock CLASS_NAMES for demo
CLASS_NAMES = {
    0: "皮带", 1: "煤量", 2: "大块", 3: "左轴",
    4: "右轴", 5: "异物", 6: "人员", 7: "烟雾"
}

def new_inference_pipeline(camera_id: int = 1, model_path: str = "best.pt"):
    """
    NEW: Inference pipeline that sends detection results via WebSocket
    WITHOUT rendering bounding boxes on the video stream
    """
    print(f"[NEW PIPELINE] Starting inference for camera {camera_id}")
    
    # Start WebSocket producer
    detection_producer.start()
    
    try:
        # Mock video source (replace with actual RTSP stream)
        cap = cv2.VideoCapture(0)  # Or RTSP URL
        if not cap.isOpened():
            print("[ERROR] Cannot open video source")
            return
            
        model = YOLO(model_path)
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_count += 1
            
            # Run YOLO inference
            results = model.predict(source=frame, conf=0.25, save=False)
            
            # NEW: Send detection results via WebSocket (non-blocking)
            detection_producer.send_detections(camera_id, results, CLASS_NAMES)
            
            # NEW: Send clean frame (no bounding boxes) to FFmpeg/HLS
            # frame would be sent to FFmpeg here without any rendering
            
            # For alarm snapshots, create a separate rendered frame:
            if needs_alarm_snapshot(results):
                rendered_frame = render_bounding_boxes(frame.copy(), results)
                save_alarm_snapshot(rendered_frame, camera_id, frame_count)
            
            # Demo: Print detection count every 30 frames
            if frame_count % 30 == 0:
                total_detections = sum(len(r.boxes) if r.boxes else 0 for r in results)
                print(f"[NEW PIPELINE] Frame {frame_count}: {total_detections} detections sent via WebSocket")
            
            time.sleep(0.04)  # Simulate 25 FPS
            
    except KeyboardInterrupt:
        print("[NEW PIPELINE] Stopped by user")
    finally:
        detection_producer.stop()
        cap.release()
        print("[NEW PIPELINE] Cleanup completed")


def needs_alarm_snapshot(results):
    """Check if any detection requires an alarm snapshot"""
    for result in results:
        if result.boxes is not None:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                # Check if this is an alarm-worthy detection
                if cls_id in [2, 5, 6, 7]:  # 大块, 异物, 人员, 烟雾
                    return True
    return False


def render_bounding_boxes(frame, results):
    """Render bounding boxes on frame (for alarm snapshots only)"""
    for result in results:
        if result.boxes is not None:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Draw label
                label = f"{CLASS_NAMES.get(cls_id, 'Unknown')}: {conf:.2f}"
                cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    
    return frame


def save_alarm_snapshot(frame, camera_id: int, frame_count: int):
    """Save alarm snapshot with bounding boxes"""
    filename = f"alarm_snapshot_cam{camera_id}_frame{frame_count}.jpg"
    cv2.imwrite(filename, frame)
    print(f"[ALARM] Saved snapshot: {filename}")


if __name__ == "__main__":
    print("=" * 60)
    print("NEW INFERENCE PIPELINE DEMO")
    print("Key changes from original:")
    print("1. Video stream has NO bounding boxes")
    print("2. Detection results sent via WebSocket")
    print("3. Alarm snapshots still have bounding boxes")
    print("4. Non-blocking WebSocket communication")
    print("=" * 60)
    
    # Start WebSocket server and demo
    try:
        new_inference_pipeline(camera_id=1)
    except Exception as e:
        print(f"Demo error: {e}")
        import traceback
        traceback.print_exc()
