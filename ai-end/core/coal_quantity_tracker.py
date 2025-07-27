"""
Coal quantity tracking module for calculating and tracking coal quantities.
"""

import logging
import threading

logger = logging.getLogger(__name__)


class CoalQuantityTracker:
    """煤量追踪器类，负责计算和追踪煤量数据"""
    
    def __init__(self):
        """初始化煤量追踪器"""
        self.lock = threading.Lock()
        
        # 全局煤量数据存储（按摄像头ID）
        self.camera_coal_quantities = {}
        
        # 皮带检测状态
        self.belt_detected = False
        self.avg_H = 0  # 平均高度
        self.avg_W = 0  # 平均宽度
        
        # 当前煤量（用于平滑处理）
        self.current_coal_quantity = 0.0
    
    def process_detections(self, results, camera_id=None):
        """
        处理检测结果并计算煤量
        
        Args:
            results: YOLO检测结果
            camera_id (int, optional): 摄像头ID
            
        Returns:
            tuple: (area_pulley, area_coal, coal_ratio_str)
        """
        with self.lock:
            area_pulley, area_coal = 0, 0
            H, W = 0, 0
            
            # 处理检测结果
            for result in results:
                if result.boxes is None:
                    continue
                    
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    area = (x2 - x1) * (y2 - y1)
                    
                    if cls == 0:  # 皮带
                        H, W = y2 - y1, x2 - x1
                        self.belt_detected = True
                        # 使用指数移动平均平滑皮带尺寸
                        self.avg_H = 0.2 * H + 0.8 * self.avg_H
                        self.avg_W = 0.2 * W + 0.8 * self.avg_W
                        area_pulley += area
                    elif cls == 1:  # 煤量
                        area_coal += area
            
            # 计算煤量比例
            coal_ratio_str = self._calculate_coal_ratio(
                area_pulley, area_coal, camera_id
            )
            
            return area_pulley, area_coal, coal_ratio_str
    
    def _calculate_coal_ratio(self, area_pulley, area_coal, camera_id):
        """
        计算煤量比例
        
        Args:
            area_pulley (int): 皮带面积
            area_coal (int): 煤量面积
            camera_id (int, optional): 摄像头ID
            
        Returns:
            str: 煤量比例字符串
        """
        if area_pulley > 0:
            coal_ratio = float(area_coal / area_pulley) * 100  # 转换为百分比
            
            # 平滑煤量变化，防止数值跳动
            if self.current_coal_quantity == 0:
                self.current_coal_quantity = coal_ratio
            else:
                self.current_coal_quantity = 0.8 * self.current_coal_quantity + 0.2 * coal_ratio
            
            # 确保煤量值在0-100之间
            self.current_coal_quantity = max(0, min(100, self.current_coal_quantity))
            
            # 更新全局字典
            if camera_id is not None:
                self.camera_coal_quantities[camera_id] = self.current_coal_quantity
            
            return f"{self.current_coal_quantity:.1f}%"
        
        return "N/A"
    
    def get_coal_quantity(self, camera_id):
        """
        获取指定摄像头的煤量数据
        
        Args:
            camera_id (int): 摄像头ID
            
        Returns:
            float: 煤量百分比
        """
        with self.lock:
            return self.camera_coal_quantities.get(camera_id, 0.0)
    
    def get_all_coal_quantities(self):
        """
        获取所有摄像头的煤量数据
        
        Returns:
            dict: 摄像头ID到煤量的映射
        """
        with self.lock:
            return self.camera_coal_quantities.copy()
    
    def get_belt_thresholds(self, belt_scale=1.0):
        """
        获取基于皮带尺寸的动态阈值
        
        Args:
            belt_scale (float): 皮带缩放因子
            
        Returns:
            tuple: (large_threshold, width_threshold)
        """
        with self.lock:
            if self.belt_detected and self.avg_H > 0 and self.avg_W > 0:
                belt_area = self.avg_H * self.avg_W
                large_threshold = belt_area * 0.3 * belt_scale
                width_threshold = self.avg_W * 0.3
            else:
                large_threshold = 1000
                width_threshold = 30
                
            return large_threshold, width_threshold
    
    def is_belt_detected(self):
        """
        检查是否检测到皮带
        
        Returns:
            bool: 是否检测到皮带
        """
        with self.lock:
            return self.belt_detected
    
    def get_belt_dimensions(self):
        """
        获取皮带尺寸信息
        
        Returns:
            dict: 皮带尺寸信息
        """
        with self.lock:
            return {
                'detected': self.belt_detected,
                'avg_height': self.avg_H,
                'avg_width': self.avg_W,
                'current_coal_quantity': self.current_coal_quantity
            }
    
    def reset(self, camera_id=None):
        """
        重置煤量数据
        
        Args:
            camera_id (int, optional): 要重置的摄像头ID，如果为None则重置所有
        """
        with self.lock:
            if camera_id is not None:
                if camera_id in self.camera_coal_quantities:
                    del self.camera_coal_quantities[camera_id]
                    logger.info(f"已重置摄像头 {camera_id} 的煤量数据")
            else:
                self.camera_coal_quantities.clear()
                self.belt_detected = False
                self.avg_H = 0
                self.avg_W = 0
                self.current_coal_quantity = 0.0
                logger.info("已重置所有煤量数据")