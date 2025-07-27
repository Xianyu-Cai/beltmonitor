"""
YOLO detection module for object detection and inference.
"""

import logging
from ultralytics import YOLO

logger = logging.getLogger(__name__)


# 检测类型到类别ID的映射
DETECTION_TYPE_TO_CLASS_IDS = {
    "大块检测": [2],         # 大块对应类别ID 2
    "异物检测": [5],         # 异物对应类别ID 5
    "人员越界检测": [6],     # 人员对应类别ID 6
    "跑偏检测": [3, 4]       # 跑偏对应类别ID 3和4（左轴和右轴）
}

# Modbus位掩码常量
DETECT_LARGE_CHUNK = 0x01    # bit0 - 大块
DETECT_FOREIGN_OBJECT = 0x02  # bit1 - 异物
DETECT_PERSONNEL = 0x04      # bit2 - 人员越界
DETECT_DEVIATION = 0x08      # bit3 - 跑偏


class YOLODetector:
    """YOLO检测器类，负责模型推理和检测逻辑"""
    
    def __init__(self, model_path, img_size=[800, 450], conf_threshold=0.25):
        """
        初始化YOLO检测器
        
        Args:
            model_path (str): 模型文件路径
            img_size (list): 输入图像尺寸
            conf_threshold (float): 置信度阈值
        """
        self.model_path = model_path
        self.img_size = img_size
        self.conf_threshold = conf_threshold
        
        self.model = None
        self.detection_counter = {cls: 0 for cls in range(8)}
        
        # 默认检测配置
        self.detection_config = {
            "大块检测": True,
            "异物检测": True,
            "人员越界检测": True,
            "跑偏检测": True
        }
        
        self._load_model()
    
    def _load_model(self):
        """加载YOLO模型"""
        try:
            self.model = YOLO(self.model_path)
            logger.info(f"YOLO模型已加载: {self.model_path}")
        except Exception as e:
            logger.error(f"加载YOLO模型失败: {e}")
            raise
    
    def update_detection_config(self, config):
        """
        更新检测配置
        
        Args:
            config (dict): 检测配置字典
        """
        self.detection_config.update(config)
        logger.info(f"检测配置已更新: {self.detection_config}")
    
    def should_detect_class(self, cls_id, modbus_client=None):
        """
        根据当前检测配置，判断是否应该检测指定类别
        
        Args:
            cls_id (int): 类别ID
            modbus_client: Modbus客户端（可选，用于实时查询）
            
        Returns:
            bool: 如果该类别当前应该被检测，则返回True，否则返回False
        """
        # 特殊类别，总是检测（皮带和煤量）
        if cls_id in [0, 1]:
            return True
        
        # 如果modbus_client可用，直接查询最新状态
        if modbus_client and modbus_client.connected:
            try:
                if hasattr(modbus_client, 'is_detection_enabled'):
                    if cls_id == 2:  # 大块
                        return modbus_client.is_detection_enabled(DETECT_LARGE_CHUNK)
                    elif cls_id == 5:  # 异物
                        return modbus_client.is_detection_enabled(DETECT_FOREIGN_OBJECT)
                    elif cls_id == 6:  # 人员
                        return modbus_client.is_detection_enabled(DETECT_PERSONNEL)
                    elif cls_id in [3, 4]:  # 跑偏
                        return modbus_client.is_detection_enabled(DETECT_DEVIATION)
            except Exception as e:
                logger.error(f"获取Modbus检测启用状态时出错: {e}")
        
        # 使用缓存的配置
        for detection_type, class_ids_list in DETECTION_TYPE_TO_CLASS_IDS.items():
            if cls_id in class_ids_list:
                return self.detection_config.get(detection_type, True)
        
        # 默认检测（如烟雾等其他类别）
        return True
    
    def get_working_class_ids(self, class_ids, modbus_client=None):
        """
        根据检测配置获取当前应该检测的类别ID列表
        
        Args:
            class_ids (list): 原始类别ID列表
            modbus_client: Modbus客户端（可选）
            
        Returns:
            list: 当前启用的类别ID列表
        """
        working_class_ids = [cid for cid in class_ids 
                           if self.should_detect_class(cid, modbus_client)]
        
        # 如果没有启用任何类别，则只检测皮带和煤量
        if not working_class_ids:
            working_class_ids = [0, 1]  # 皮带和煤量
            
        return working_class_ids
    
    def predict(self, frame, class_ids, modbus_client=None):
        """
        对单帧图像进行检测
        
        Args:
            frame: 输入图像帧
            class_ids (list): 要检测的类别ID列表
            modbus_client: Modbus客户端（可选）
            
        Returns:
            检测结果
        """
        if self.model is None:
            logger.error("YOLO模型未加载")
            return None
        
        # 获取当前启用的类别
        working_class_ids = self.get_working_class_ids(class_ids, modbus_client)
        
        try:
            # 执行检测
            results = self.model.predict(
                source=frame, 
                imgsz=self.img_size, 
                conf=self.conf_threshold, 
                classes=working_class_ids, 
                save=False
            )
            
            # 更新检测计数
            for result in results:
                if result.boxes is not None:
                    for box in result.boxes:
                        cls = int(box.cls[0])
                        self.detection_counter[cls] += 1
            
            return results
            
        except Exception as e:
            logger.error(f"YOLO检测时发生异常: {e}")
            return None
    
    def get_detection_stats(self):
        """
        获取检测统计信息
        
        Returns:
            dict: 检测统计数据
        """
        return {
            'total_detections': sum(self.detection_counter.values()),
            'class_counts': self.detection_counter.copy(),
            'detection_config': self.detection_config.copy()
        }
    
    def reset_stats(self):
        """重置检测统计"""
        self.detection_counter = {cls: 0 for cls in range(8)}
        logger.info("检测统计已重置")