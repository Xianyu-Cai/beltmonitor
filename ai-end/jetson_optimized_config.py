"""
Jetson Orin NX 优化配置
"""
import os
import cv2
import torch
import pycuda.driver as cuda
import tensorrt as trt

class JetsonOptimizer:
    def __init__(self):
        self.device = torch.device('cuda:0')
        self.batch_size = 2  # 批处理大小
        self.detection_interval = 0.5  # 检测间隔（秒）
        
    def setup_jetson_optimizations(self):
        """设置Jetson硬件优化"""
        # GPU内存分配策略
        torch.cuda.set_per_process_memory_fraction(0.8)
        torch.cuda.empty_cache()
        
        # 启用cudnn优化
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False
        
        # 设置CUDA流
        self.stream = cuda.Stream()
        
    def create_optimized_pipeline(self, rtsp_url):
        """创建优化的视频处理管道"""
        # GStreamer硬件加速管道
        gst_pipeline = (
            f'rtspsrc location={rtsp_url} latency=0 ! '
            f'rtph264depay ! h264parse ! '
            f'nvv4l2decoder enable-max-performance=1 ! '
            f'nvvidconv ! video/x-raw,width=640,height=360,format=RGB ! '
            f'videoconvert ! video/x-raw,format=RGB ! '
            f'appsink drop=true max-buffers=2'
        )
        
        cap = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
        return cap
        
    def load_optimized_model(self, model_path):
        """加载TensorRT优化模型"""
        engine_path = model_path.replace('.pt', '.engine')
        
        if os.path.exists(engine_path):
            # 使用现有TensorRT引擎
            return engine_path
        else:
            # 创建TensorRT引擎
            self.create_tensorrt_engine(model_path, engine_path)
            return engine_path
            
    def create_tensorrt_engine(self, model_path, engine_path):
        """创建TensorRT引擎"""
        from ultralytics import YOLO
        
        model = YOLO(model_path)
        model.export(
            format='engine',
            device=0,
            half=True,  # FP16
            int8=True,  # INT8量化
            data='coco128.yaml',
            workspace=4,  # 4GB工作空间
            batch=self.batch_size
        )

class PerformanceMonitor:
    def __init__(self):
        self.frame_count = 0
        self.start_time = time.time()
        
    def get_fps(self):
        elapsed = time.time() - self.start_time
        fps = self.frame_count / elapsed if elapsed > 0 else 0
        return fps
        
    def log_performance(self):
        fps = self.get_fps()
        gpu_util = torch.cuda.utilization()
        memory_used = torch.cuda.memory_allocated() / 1024**3  # GB
        
        print(f"FPS: {fps:.1f}, GPU: {gpu_util}%, Memory: {memory_used:.2f}GB")

# 优化配置参数
OPTIMIZED_CONFIG = {
    'input': {
        'width': 640,
        'height': 360,
        'fps': 25,
        'sample_rate': 2,  # 每2帧采样一次
    },
    'model': {
        'precision': 'int8',
        'batch_size': 2,
        'confidence': 0.3,
    },
    'output': {
        'width': 640,
        'height': 360,
        'bitrate': 1000000,  # 1Mbps
        'preset': 'fast',
    },
    'system': {
        'max_memory': 6,  # GB
        'gpu_utilization': 80,  # %
        'cpu_cores': 6,  # 使用6个CPU核心
    }
}