"""
Video processing module for handling video capture and frame processing.
"""

import cv2
import threading
import logging

logger = logging.getLogger(__name__)


class VideoProcessor:
    """处理视频捕获和帧处理的类"""
    
    def __init__(self, rtsp_url, target_width=800, target_height=450):
        """
        初始化视频处理器
        
        Args:
            rtsp_url (str): RTSP视频流地址
            target_width (int): 目标宽度
            target_height (int): 目标高度
        """
        self.rtsp_url = rtsp_url
        self.target_width = target_width
        self.target_height = target_height
        
        self.cap = None
        self.original_width = 0
        self.original_height = 0
        self.fps = 25
        self.scale_x = 1.0
        self.scale_y = 1.0
        self.scale_factor = 1.0
        
        self.lock = threading.Lock()
        self.is_opened = False
        
    def open(self):
        """
        打开视频流
        
        Returns:
            bool: 是否成功打开
        """
        with self.lock:
            try:
                self.cap = cv2.VideoCapture(self.rtsp_url)
                if not self.cap.isOpened():
                    logger.error(f"无法打开RTSP流: {self.rtsp_url}")
                    return False
                
                # 获取原始视频尺寸
                self.original_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                self.original_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 25
                
                # 计算缩放比例
                self.scale_x = self.target_width / self.original_width if self.original_width > 0 else 1.0
                self.scale_y = self.target_height / self.original_height if self.original_height > 0 else 1.0
                self.scale_factor = min(self.scale_x, self.scale_y)
                
                logger.info(f"视频流已打开: {self.original_width}x{self.original_height} -> {self.target_width}x{self.target_height}")
                logger.info(f"缩放比例: X={self.scale_x:.3f}, Y={self.scale_y:.3f}, 统一比例={self.scale_factor:.3f}")
                
                self.is_opened = True
                return True
                
            except Exception as e:
                logger.error(f"打开视频流时发生异常: {e}")
                return False
    
    def read_frame(self):
        """
        读取并处理一帧图像
        
        Returns:
            tuple: (是否成功, 处理后的帧)
        """
        if not self.is_opened or not self.cap:
            return False, None
            
        with self.lock:
            try:
                ret, frame = self.cap.read()
                if not ret:
                    logger.warning("无法读取帧")
                    return False, None
                
                # 缩放帧到目标分辨率
                frame = cv2.resize(frame, (self.target_width, self.target_height))
                return True, frame
                
            except Exception as e:
                logger.error(f"读取帧时发生异常: {e}")
                return False, None
    
    def close(self):
        """关闭视频流"""
        with self.lock:
            if self.cap:
                self.cap.release()
                self.cap = None
            self.is_opened = False
            logger.info("视频流已关闭")
    
    def get_properties(self):
        """
        获取视频属性
        
        Returns:
            dict: 视频属性信息
        """
        return {
            'original_width': self.original_width,
            'original_height': self.original_height,
            'target_width': self.target_width,
            'target_height': self.target_height,
            'fps': self.fps,
            'scale_x': self.scale_x,
            'scale_y': self.scale_y,
            'scale_factor': self.scale_factor,
            'is_opened': self.is_opened
        }
    
    def __enter__(self):
        """上下文管理器入口"""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.close()