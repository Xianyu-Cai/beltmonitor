"""
Alarm processing module for handling alarm logic and reporting.
"""

import logging
from alarm_type_mapper import AlarmTypeMapper
from utils.drawing import CLASS_NAMES

logger = logging.getLogger(__name__)


class AlarmProcessor:
    """报警处理器类，负责报警逻辑和事件上报"""
    
    def __init__(self, event_reporter=None, modbus_client=None, config_manager=None):
        """
        初始化报警处理器
        
        Args:
            event_reporter: 事件上报器实例
            modbus_client: Modbus客户端实例
            config_manager: 配置管理器实例
        """
        self.event_reporter = event_reporter
        self.modbus_client = modbus_client
        self.config_manager = config_manager
        
        # 检测配置（从外部传入或使用默认值）
        self.detection_config = {
            "大块检测": True,
            "异物检测": True,
            "人员越界检测": True,
            "跑偏检测": True
        }
    
    def update_detection_config(self, config):
        """
        更新检测配置
        
        Args:
            config (dict): 检测配置字典
        """
        self.detection_config.update(config)
        logger.info(f"报警处理器检测配置已更新: {self.detection_config}")
    
    def process_detection_results(self, results, frame, detected_classes_set, 
                                person_region=None, smoke_threshold=0.5, 
                                large_block_ratio=0.3, target_width=800):
        """
        处理检测结果并触发相应的报警
        
        Args:
            results: YOLO检测结果
            frame: 当前帧图像
            detected_classes_set (set): 当前帧检测到的所有类别ID集合
            person_region (list, optional): 人员检测区域坐标
            smoke_threshold (float): 烟雾检测阈值
            large_block_ratio (float): 大块检测比例阈值
            target_width (int): 目标图像宽度
        """
        for result in results:
            if result.boxes is None:
                continue
                
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                confidence = float(box.conf[0])
                
                # 跳过煤量报警的上报（cls == 1）
                if cls == 1:
                    continue
                
                # 获取报警规则ID
                alarm_rule_id = AlarmTypeMapper.get_alarm_rule_id(cls, detected_classes_set)
                
                if alarm_rule_id:
                    alarm_name = AlarmTypeMapper.get_alarm_name(alarm_rule_id)
                    should_report = self._should_report_alarm(
                        cls, box, confidence, detected_classes_set, 
                        person_region, smoke_threshold, large_block_ratio, target_width
                    )
                    
                    if should_report:
                        self._report_alarm(cls, alarm_name, confidence, frame, alarm_rule_id)
    
    def _should_report_alarm(self, cls, box, confidence, detected_classes_set, 
                           person_region, smoke_threshold, large_block_ratio, target_width):
        """
        判断是否应该上报报警
        
        Args:
            cls (int): 类别ID
            box: 检测框对象
            confidence (float): 置信度
            detected_classes_set (set): 检测到的类别集合
            person_region (list): 人员检测区域
            smoke_threshold (float): 烟雾阈值
            large_block_ratio (float): 大块比例阈值
            target_width (int): 目标图像宽度
            
        Returns:
            bool: 是否应该上报
        """
        if cls == 2:  # 大块检测
            if not self.detection_config["大块检测"]:
                return False
                
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            block_width = x2 - x1
            
            should_report = AlarmTypeMapper.should_report_large_block(
                block_width=block_width,
                image_width=target_width,
                threshold_ratio=large_block_ratio
            )
            
            # 记录大块检测信息
            actual_ratio = block_width / target_width
            logger.info(f"大块检测 - 宽度: {block_width}, 图像宽度: {target_width}, "
                       f"实际比例: {actual_ratio:.4f}, 阈值: {large_block_ratio}, "
                       f"是否上报: {should_report}")
            
            return should_report
            
        elif cls == 6 and person_region:  # 人员检测
            if not self.detection_config["人员越界检测"]:
                return False
                
            xc = (box.xyxy[0][0] + box.xyxy[0][2]) / 2
            yc = (box.xyxy[0][1] + box.xyxy[0][3]) / 2
            return (person_region[0] <= xc <= person_region[2] and 
                   person_region[1] <= yc <= person_region[3])
            
        elif cls == 7:  # 烟雾检测
            return confidence >= smoke_threshold
            
        elif cls == 5:  # 异物报警
            return self.detection_config["异物检测"]
            
        elif cls in [3, 4]:  # 跑偏报警
            if not self.detection_config["跑偏检测"]:
                return False
            # 只有当左轴和右轴不是同时检测到时才报警
            return not (3 in detected_classes_set and 4 in detected_classes_set)
        
        return False
    
    def _report_alarm(self, cls, alarm_name, confidence, frame, alarm_rule_id):
        """
        上报报警事件
        
        Args:
            cls (int): 类别ID
            alarm_name (str): 报警名称
            confidence (float): 置信度
            frame: 图像帧
            alarm_rule_id (int): 报警规则ID
        """
        try:
            logger.info(f"检测事件 - 类别: {cls}, 报警类型: {alarm_name}, "
                       f"报警规则ID: {alarm_rule_id}, 置信度: {confidence:.4f}")
            
            # 通过Modbus发送报警信号
            if self.modbus_client:
                self.modbus_client.send_alarm(alarm_name, confidence, True)
            
            # 通过HTTP上报事件
            if self.event_reporter and self.config_manager:
                self.event_reporter.report_alarm_event(
                    camera_id=self.config_manager.camera_id,
                    alarm_type=alarm_name,
                    confidence=confidence,
                    frame=frame,
                    alarm_rule_id=alarm_rule_id
                )
                
        except Exception as e:
            logger.error(f"上报事件或发送Modbus信号失败: {e}")
            import traceback
            traceback.print_exc()
    
    def clear_all_alarms(self):
        """清除所有报警信号"""
        if self.modbus_client:
            self.modbus_client.clear_all_alarms()
            logger.info("已清除所有Modbus报警信号")
    
    def get_detection_config(self):
        """
        获取当前检测配置
        
        Returns:
            dict: 检测配置
        """
        return self.detection_config.copy()