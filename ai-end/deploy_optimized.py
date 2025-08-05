#!/usr/bin/env python3
"""
Jetson Orin NX优化部署脚本
"""
import os
import subprocess
import psutil
import torch
import logging
from jetson_optimized_config import JetsonOptimizer, OPTIMIZED_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedDeployer:
    def __init__(self, camera_id=1):
        self.camera_id = camera_id
        self.optimizer = JetsonOptimizer()
        
    def setup_system(self):
        """系统级优化设置"""
        logger.info("设置Jetson系统优化...")
        
        # 设置最大性能模式
        subprocess.run(['sudo', 'nvpmodel', '-m', '0'], check=True)
        subprocess.run(['sudo', 'jetson_clocks'], check=True)
        
        # 设置GPU时钟
        try:
            with open('/sys/kernel/debug/clk/override.gbus/rate', 'w') as f:
                f.write('1300500000')
        except PermissionError:
            logger.warning("需要sudo权限设置GPU时钟")
            
        # 设置内存优化
        os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:128'
        
    def optimize_opencv(self):
        """优化OpenCV设置"""
        cv2.setNumThreads(0)  # 禁用OpenCV多线程
        cv2.ocl.setUseOpenCL(False)  # 禁用OpenCL
        
    def create_optimized_launch_script(self):
        """创建优化启动脚本"""
        script_content = f'''#!/bin/bash
# Jetson Orin NX优化启动脚本

echo "启动摄像头{self.camera_id}优化检测..."

# 系统优化
sudo nvpmodel -m 0
sudo jetson_clocks

# 环境变量设置
export CUDA_VISIBLE_DEVICES=0
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128

# 启动优化检测
python3 detect-cap-1.py \
    --model best.engine \
    --source rtsp://admin:123456@192.168.1.100:554/h264/ch1/main/av_stream \
    --cameraid {self.camera_id} \
    --img-size 640 \
    --conf 0.3 \
    --detection-interval 0.5 \
    --hls-dir hls_output \
    --hls-filename output.m3u8

# 监控GPU使用率
watch -n 1 nvidia-smi
'''
        
        with open(f'start_camera_{self.camera_id}_optimized.sh', 'w') as f:
            f.write(script_content)
        os.chmod(f'start_camera_{self.camera_id}_optimized.sh', 0o755)
        
    def monitor_performance(self):
        """性能监控"""
        import time
        
        while True:
            # GPU信息
            gpu_util = torch.cuda.utilization()
            memory_used = torch.cuda.memory_allocated() / 1024**3
            
            # CPU信息
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            
            logger.info(f"GPU: {gpu_util}%, GPU内存: {memory_used:.2f}GB, "
                       f"CPU: {cpu_percent}%, 系统内存: {memory.percent}%")
            
            time.sleep(10)
            
    def deploy(self):
        """完整部署流程"""
        logger.info("开始Jetson Orin NX优化部署...")
        
        # 1. 系统设置
        self.setup_system()
        
        # 2. 模型优化
        self.optimizer.setup_jetson_optimizations()
        self.optimizer.load_optimized_model('best.pt')
        
        # 3. OpenCV优化
        self.optimize_opencv()
        
        # 4. 创建启动脚本
        self.create_optimized_launch_script()
        
        logger.info("优化部署完成！")
        logger.info(f"运行 ./start_camera_{self.camera_id}_optimized.sh 启动优化检测")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--camera-id', type=int, default=1, help='摄像头ID')
    args = parser.parse_args()
    
    deployer = OptimizedDeployer(args.camera_id)
    deployer.deploy()