# alarm_type_mapper.py

class AlarmTypeMapper:
    # 类别到报警规则ID的映射（煤量作为连续数据，不通过报警系统处理）
    ALARM_RULE_MAPPING = {
        6: 1,  # 类别6（人员）-> 人员报警 (alarm_rule中的id为1)
        5: 2,  # 类别5（异物）-> 异物报警 (alarm_rule中的id为2)
        2: 3,  # 类别2（大块）-> 大块报警 (alarm_rule中的id为3)
        # 类别1（煤量）作为连续数据，不通过报警系统处理
        3: 5,  # 类别3（左轴）可能导致跑偏报警 (alarm_rule中的id为5)
        4: 5,  # 类别4（右轴）可能导致跑偏报警 (alarm_rule中的id为5)
        7: 6,  # 类别7（烟雾）-> 烟雾报警 (alarm_rule中的id为6)
    }
    
    # 类别名称
    CLASS_NAMES = {
        0: "皮带", 1: "煤量", 2: "大块", 3: "左轴",
        4: "右轴", 5: "异物", 6: "人员", 7: "烟雾"
    }
    
    # 报警规则ID到报警名称的映射（煤量作为连续数据，不通过报警系统处理）
    ALARM_NAMES = {
        1: "人员越位报警",
        2: "异物报警",
        3: "大块报警",
        # 4: "煤量报警" 煤量作为连续数据，不通过报警系统
        5: "跑偏报警",
        6: "烟雾报警"
    }
    
    @staticmethod
    def get_alarm_rule_id(detected_class, detected_classes_set):
        """
        根据检测到的类别获取对应的报警规则ID
        
        Args:
            detected_class: 检测到的类别ID
            detected_classes_set: 当前帧中检测到的所有类别ID的集合
        
        Returns:
            int: 报警规则ID，如果不需要报警则返回None
        """
        # 特殊情况：类别3和4的处理（跑偏报警）
        if detected_class in [3, 4]:
            # 如果同时检测到了类别3和4，则不视为跑偏报警
            if 3 in detected_classes_set and 4 in detected_classes_set:
                return None
            # 如果检测到了类别3（左轴）但没有检测到类别4（右轴），报警
            elif detected_class == 3 and 4 not in detected_classes_set:
                return AlarmTypeMapper.ALARM_RULE_MAPPING.get(detected_class)
            # 如果检测到了类别4（右轴）但没有检测到类别3（左轴），报警
            elif detected_class == 4 and 3 not in detected_classes_set:
                return AlarmTypeMapper.ALARM_RULE_MAPPING.get(detected_class)
            # 其他情况（理论上不会出现），不报警
            else:
                return None
        
        # 其他类别直接查找映射表
        return AlarmTypeMapper.ALARM_RULE_MAPPING.get(detected_class)
    
    @staticmethod
    def get_alarm_name(alarm_rule_id):
        """根据报警规则ID获取报警名称"""
        return AlarmTypeMapper.ALARM_NAMES.get(alarm_rule_id, "未知报警")
    
    @staticmethod
    def should_report_large_block(block_width, image_width, threshold_ratio):
        """
        判断大块是否需要上报
        
        Args:
            block_width: 检测到的大块宽度
            image_width: 图像宽度
            threshold_ratio: 阈值比例(0-1)
            
        Returns:
            bool: 如果大块的宽度与图像宽度的比值大于阈值，则返回True
        """
        if block_width <= 0 or image_width <= 0:
            return False
        
        actual_ratio = block_width / image_width
        return actual_ratio > threshold_ratio