"""
Windows CUDA环境优化器
专为NVIDIA GPU的Windows系统优化
"""
import os
import cv2
import torch
import time
import psutil
import subprocess
import logging
from pathlib import Path
import numpy as np
from typing import Optional, Tuple
import threading
from queue import Queue

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WindowsCUDAOptimizer:
    def __init__(self):
        self.cuda_available = torch.cuda.is_available()
        self.device = torch.device('cuda' if self.cuda_available else 'cpu')
        self.gpu_memory_total = 0
        self.gpu_memory_used = 0
        
        if self.cuda_available:
            self.gpu_memory_total = torch.cuda.get_device_properties(0).total_memory
            logger.info(f"CUDA可用: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU内存: {self.gpu_memory_total / 1024**3:.1f}GB")
        else:
            logger.warning("CUDA不可用，将使用CPU优化")
    
    def check_cuda_installation(self) -> bool:
        """检查CUDA安装状态"""
        try:
            # 检查NVIDIA驱动
            result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("NVIDIA驱动已安装")
                logger.info(result.stdout.split('\n')[8])  # GPU信息行
                return True
            else:
                logger.error("NVIDIA驱动未找到或未正确安装")
                return False
        except FileNotFoundError:
            logger.error("nvidia-smi未找到，请安装NVIDIA驱动")
            return False
    
    def install_cuda_pytorch(self):
        """安装CUDA版本的PyTorch"""
        cuda_install_commands = [
            # 卸载CPU版本
            'pip uninstall torch torchvision torchaudio -y',
            # 安装CUDA 11.8版本
            'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118',
            # 或者CUDA 12.1版本
            # 'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121'
        ]
        
        logger.info("准备安装CUDA版PyTorch...")
        for cmd in cuda_install_commands:
            logger.info(f"执行: {cmd}")
            # 实际执行时取消注释
            # subprocess.run(cmd, shell=True)
    
    def optimize_opencv_cuda(self):
        """优化OpenCV CUDA支持"""
        try:
            # 检查OpenCV CUDA支持
            logger.info(f"OpenCV版本: {cv2.__version__}")
            
            # 检查CUDA编译的OpenCV
            build_info = cv2.getBuildInformation()
            if 'CUDA:YES' in build_info:
                logger.info("OpenCV已启用CUDA支持")
            else:
                logger.warning("OpenCV未启用CUDA，建议安装opencv-python-cuda")
                
        except Exception as e:
            logger.error(f"OpenCV CUDA检查失败: {e}")
    
    def create_optimized_video_capture(self, rtsp_url: str) -> cv2.VideoCapture:
        """创建优化的视频捕获"""
        if self.cuda_available:
            # 尝试使用CUDA加速的解码
            try:
                # NVIDIA Video Codec SDK优化的捕获
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                if cap.isOpened():
                    # 设置CUDA加速属性
                    cap.set(cv2.CAP_PROP_HW_ACCELERATION, cv2.VIDEO_ACCELERATION_ANY)
                    logger.info("使用CUDA加速视频解码")
                return cap
            except:
                logger.warning("CUDA解码不可用，使用标准解码")
        
        # 回退到标准捕获
        cap = cv2.VideoCapture(rtsp_url)
        return cap
    
    def optimize_cuda_memory(self):
        """优化CUDA内存使用"""
        if self.cuda_available:
            # 设置内存分配策略
            torch.cuda.empty_cache()
            torch.cuda.set_per_process_memory_fraction(0.8)
            
            # 启用cudnn优化
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
            
            logger.info("CUDA内存已优化")
    
    def optimize_model_inference(self, model_path: str) -> str:
        """优化模型推理"""
        if not self.cuda_available:
            logger.warning("CUDA不可用，跳过模型优化")
            return model_path
        
        try:
            from ultralytics import YOLO
            
            # 检查模型是否已优化
            optimized_path = model_path.replace('.pt', '_cuda.pt')
            
            if os.path.exists(optimized_path):
                logger.info(f"使用现有优化模型: {optimized_path}")
                return optimized_path
            
            logger.info("优化YOLO模型...")
            model = YOLO(model_path)
            
            # 自动半精度优化
            model.model.half()  # FP16
            
            # 保存优化模型
            torch.save(model.model.state_dict(), optimized_path)
            
            logger.info(f"模型优化完成: {optimized_path}")
            return optimized_path
            
        except Exception as e:
            logger.error(f"模型优化失败: {e}")
            return model_path
    
    def create_performance_monitor(self):
        """创建性能监控器"""
        def monitor():
            while True:
                if self.cuda_available:
                    gpu_util = torch.cuda.utilization()
                    memory_used = torch.cuda.memory_allocated() / 1024**3
                    logger.info(f"GPU使用率: {gpu_util}%, GPU内存: {memory_used:.2f}GB")
                
                # 系统信息
                cpu_percent = psutil.cpu_percent()
                memory = psutil.virtual_memory()
                logger.info(f"CPU: {cpu_percent}%, 内存: {memory.percent}%")
                
                time.sleep(5)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        return monitor_thread

class OptimizedVideoProcessor:
    def __init__(self, optimizer: WindowsCUDAOptimizer):
        self.optimizer = optimizer
        self.device = optimizer.device
        self.batch_size = 2 if optimizer.cuda_available else 1
        self.detection_interval = 0.5  # 每500ms检测一次
        
    def create_efficient_pipeline(self, rtsp_url: str, model_path: str):
        """创建高效处理管道"""
        
        # 1. 优化视频捕获
        cap = self.optimizer.create_optimized_video_capture(rtsp_url)
        
        # 2. 优化模型
        optimized_model = self.optimizer.optimize_model_inference(model_path)
        
        # 3. 设置CUDA内存
        self.optimizer.optimize_cuda_memory()
        
        # 4. 启动性能监控
        self.optimizer.create_performance_monitor()
        
        return {
            'cap': cap,
            'model': optimized_model,
            'device': self.device
        }

def create_install_script():
    """创建CUDA环境安装脚本"""
    install_script = """@echo off
echo Windows CUDA环境安装脚本
echo.

echo 检查NVIDIA驱动...
nvidia-smi
if %errorlevel% neq 0 (
    echo 请安装最新NVIDIA驱动
    pause
    exit /b 1
)

echo 安装CUDA版PyTorch...
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

echo 安装OpenCV优化版...
pip install opencv-python-headless
pip install opencv-contrib-python

echo 安装性能监控工具...
pip install psutil
pip install nvidia-ml-py3

echo 安装完成！
pause
"""
    
    with open('install_cuda_env.bat', 'w') as f:
        f.write(install_script)
    
    logger.info("已创建CUDA安装脚本: install_cuda_env.bat")

def create_optimized_config():
    """创建优化配置文件"""
    config = {
        "windows_cuda": {
            "video_capture": {
                "backend": "cv2.CAP_FFMPEG",
                "hw_acceleration": True,
                "buffer_size": 2,
                "drop_frames": True
            },
            "model": {
                "precision": "fp16",
                "batch_size": 2,
                "device": "cuda",
                "memory_fraction": 0.8
            },
            "performance": {
                "detection_interval": 0.5,  # 秒
                "max_fps": 10,
                "memory_cleanup": True
            },
            "system": {
                "gpu_monitoring": True,
                "cpu_affinity": True,
                "priority": "high"
            }
        }
    }
    
    import json
    with open('windows_cuda_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    logger.info("已创建优化配置文件: windows_cuda_config.json")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Windows CUDA优化器')
    parser.add_argument('--check', action='store_true', help='检查CUDA环境')
    parser.add_argument('--install', action='store_true', help='创建安装脚本')
    parser.add_argument('--optimize', action='store_true', help='运行优化配置')
    
    args = parser.parse_args()
    
    optimizer = WindowsCUDAOptimizer()
    
    if args.check:
        optimizer.check_cuda_installation()
    
    if args.install:
        create_install_script()
        create_optimized_config()
    
    if args.optimize:
        logger.info("运行Windows CUDA优化配置...")
        optimizer.optimize_cuda_memory()
        optimizer.optimize_opencv_cuda()