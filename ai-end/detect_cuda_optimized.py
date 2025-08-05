"""
Windows CUDA优化版检测脚本
基于原始detect-cap-1.py进行CUDA优化
"""
import warnings
warnings.filterwarnings('ignore')

import argparse
import os
import cv2
import subprocess
import threading
import time
import queue
import json
import numpy as np
from pathlib import Path
import torch
import psutil

# 导入原始模块
from ultralytics import YOLO
from config_manager import config_manager
from alarm_type_mapper import AlarmTypeMapper
from event_reporter import EventReporter
from modbus_client import ModbusClient
from ws_producer import detection_producer

class CudaOptimizedDetector:
    def __init__(self, camera_id=None):
        self.camera_id = camera_id
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.cuda_available = torch.cuda.is_available()
        
        if self.cuda_available:
            print(f"🚀 CUDA可用: {torch.cuda.get_device_name(0)}")
            torch.cuda.empty_cache()
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
        else:
            print("⚠️ CUDA不可用，使用CPU模式")
    
    def optimize_video_capture(self, rtsp_url: str) -> cv2.VideoCapture:
        """优化视频捕获"""
        print("📹 优化视频捕获...")
        
        # 尝试FFmpeg后端
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            cap = cv2.VideoCapture(rtsp_url)
        
        if cap.isOpened():
            # 优化缓冲区设置
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
            cap.set(cv2.CAP_PROP_FPS, 15)  # 降低FPS
            
            # 获取实际参数
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            print(f"📊 视频参数: {width}x{height}@{fps}fps")
            
        return cap
    
    def optimize_model(self, model_path: str) -> YOLO:
        """优化YOLO模型"""
        print("🧠 优化YOLO模型...")
        
        model = YOLO(model_path)
        
        if self.cuda_available:
            # 移动到GPU
            model.model.to(self.device)
            # 半精度优化
            model.model.half()
            print("✅ 模型已优化为CUDA+FP16")
        else:
            print("⚠️ 使用标准CPU模型")
            
        return model
    
    def create_optimized_ffmpeg(self, width: int, height: int, fps: int, camera_id: int = None) -> Tuple[subprocess.Popen, str]:
        """创建优化的FFmpeg进程"""
        output_dir = 'hls_output'
        os.makedirs(output_dir, exist_ok=True)
        
        if camera_id:
            camera_dir = os.path.join(output_dir, f'camera_{camera_id}')
            os.makedirs(camera_dir, exist_ok=True)
            output_path = os.path.join(camera_dir, 'output.m3u8')
            hls_url = f"http://localhost:{2000 + camera_id}/hls_output/camera_{camera_id}/output.m3u8"
        else:
            output_path = os.path.join(output_dir, 'output.m3u8')
            hls_url = "http://localhost:2022/hls_output/output.m3u8"
        
        # 优化FFmpeg命令
        command = [
            'ffmpeg', '-y',
            '-f', 'rawvideo',
            '-vcodec', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-s', f'{width}x{height}',
            '-r', str(fps),
            '-i', '-',
            '-c:v', 'h264_nvenc',  # NVIDIA硬件编码
            '-preset', 'fast',
            '-pix_fmt', 'yuv420p',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '5',
            '-hls_flags', 'delete_segments',
            output_path
        ]
        
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        return process, hls_url
    
    def monitor_performance(self):
        """性能监控器"""
        def monitor():
            while True:
                if self.cuda_available:
                    gpu_util = torch.cuda.utilization()
                    memory_used = torch.cuda.memory_allocated() / 1024**3
                    print(f"📈 GPU: {gpu_util}% | 显存: {memory_used:.2f}GB")
                
                # 系统信息
                cpu_percent = psutil.cpu_percent()
                memory = psutil.virtual_memory()
                print(f"💻 CPU: {cpu_percent}% | 内存: {memory.percent}%")
                
                time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
    
    def cuda_predict_realtime(self, model_path: str, rtsp_url: str, **kwargs):
        """CUDA优化的实时预测"""
        print("🎯 启动CUDA优化检测...")
        
        # 优化视频捕获
        cap = self.optimize_video_capture(rtsp_url)
        if not cap.isOpened():
            raise IOError(f"无法打开视频流: {rtsp_url}")
        
        # 优化模型
        model = self.optimize_model(model_path)
        
        # 启动性能监控
        self.monitor_performance()
        
        # 设置目标分辨率
        target_width = 640
        target_height = 360
        fps = 15
        
        # 优化FFmpeg
        ffmpeg_process, hls_url = self.create_optimized_ffmpeg(
            target_width, target_height, fps, self.camera_id
        )
        
        # 更新数据库
        if self.camera_id:
            from config_manager import config_manager
            config_manager.update_camera_hls_url(self.camera_id, hls_url)
        
        frame_count = 0
        last_detection_time = 0
        detection_interval = kwargs.get('detection_interval', 0.5)
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # 智能采样：只在时间间隔到达时检测
                if current_time - last_detection_time >= detection_interval:
                    # 调整大小
                    frame_resized = cv2.resize(frame, (target_width, target_height))
                    
                    if self.cuda_available:
                        # CUDA加速推理
                        frame_tensor = torch.from_numpy(frame_resized).to(self.device)
                        frame_tensor = frame_tensor.half()
                    
                    # YOLO检测
                    results = model.predict(
                        source=frame_resized,
                        imgsz=640,
                        conf=kwargs.get('conf', 0.25),
                        device=self.device,
                        half=self.cuda_available,
                        save=False,
                        verbose=False
                    )
                    
                    # 处理结果...
                    self.process_results(results, frame_resized)
                    
                    last_detection_time = current_time
                
                # 发送帧到FFmpeg
                if ffmpeg_process.stdin:
                    try:
                        ffmpeg_process.stdin.write(frame.tobytes())
                        ffmpeg_process.stdin.flush()
                    except BrokenPipeError:
                        print("❌ FFmpeg管道已损坏")
                        break
                
                if frame_count % 30 == 0:
                    print(f"📊 已处理 {frame_count} 帧")
        
        except KeyboardInterrupt:
            print("\n⏹️ 用户中断检测")
        
        finally:
            cap.release()
            if ffmpeg_process.stdin:
                ffmpeg_process.stdin.close()
            ffmpeg_process.wait()
            
            if self.cuda_available:
                torch.cuda.empty_cache()
    
    def process_results(self, results, frame):
        """处理检测结果"""
        # 这里可以添加自定义的处理逻辑
        pass

def create_cuda_launch_script():
    """创建CUDA启动脚本"""
    script_content = """@echo off
echo Windows CUDA优化检测启动器
echo.

REM 检查CUDA
python -c "import torch; print('CUDA可用:', torch.cuda.is_available())"

REM 设置优化环境
set CUDA_VISIBLE_DEVICES=0
set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128

echo.
echo 启动优化检测...
python detect_cuda_optimized.py --model best.pt --source rtsp://your_camera_url --cameraid 1 --detection-interval 0.5

pause
"""
    
    with open('start_cuda_optimized.bat', 'w') as f:
        f.write(script_content)
    
    print("✅ 已创建启动脚本: start_cuda_optimized.bat")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Windows CUDA优化检测')
    parser.add_argument('--model', required=True, help='模型路径')
    parser.add_argument('--source', required=True, help='视频源URL')
    parser.add_argument('--cameraid', type=int, help='摄像头ID')
    parser.add_argument('--detection-interval', type=float, default=0.5, help='检测间隔(秒)')
    parser.add_argument('--conf', type=float, default=0.25, help='置信度阈值')
    
    args = parser.parse_args()
    
    # 检查CUDA
    if torch.cuda.is_available():
        print("🎉 CUDA环境已就绪！")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"CUDA版本: {torch.version.cuda}")
    else:
        print("⚠️ CUDA不可用，将使用CPU优化")
    
    # 启动检测
    detector = CudaOptimizedDetector(args.cameraid)
    detector.cuda_predict_realtime(
        model_path=args.model,
        rtsp_url=args.source,
        detection_interval=args.detection_interval,
        conf=args.conf
    )