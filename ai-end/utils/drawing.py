"""
Drawing utilities for detection visualization.
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


# 类别名称和颜色定义
CLASS_NAMES = {
    0: "皮带", 1: "煤量", 2: "大块", 3: "左轴",
    4: "右轴", 5: "异物", 6: "人员", 7: "烟雾"
}

CLASS_COLORS = {
    0: (0, 255, 0), 1: (0, 0, 255), 2: (255, 0, 0),
    3: (0, 255, 255), 4: (255, 255, 0), 5: (255, 0, 255),
    6: (255, 165, 0), 7: (128, 128, 128)
}


def get_font(size=60, font_path=None):
    """
    获取字体对象
    
    Args:
        size (int): 字体大小
        font_path (str): 字体文件路径
        
    Returns:
        PIL.ImageFont: 字体对象
    """
    try:
        font_path = font_path or "./WenJinMincho-TTF.ttc"
        return ImageFont.truetype(font_path, size)
    except IOError:
        return ImageFont.load_default()


class Drawer:
    """绘制检测结果的工具类"""
    
    @staticmethod
    def draw(frame, box, label, ratio=None, scale_factor=1.0):
        """
        在帧上绘制检测框和标签
        
        Args:
            frame: 输入图像帧
            box: 检测框对象
            label (str): 标签文本
            ratio (str, optional): 比例信息（用于煤量显示）
            scale_factor (float): 缩放因子，用于调整线条粗细和字体大小
            
        Returns:
            绘制后的图像帧
        """
        # 根据缩放因子调整锚框坐标
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        
        # 如果需要，可以根据scale_factor调整锚框线条粗细
        line_thickness = max(1, int(2 * scale_factor))
        
        cls = int(box.cls[0])
        color = CLASS_COLORS.get(cls, (255, 255, 255))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, line_thickness)
        
        label_text = f"{label}{f': {ratio}' if cls == 1 and ratio else ''}"
        pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil_img)
        
        # 根据缩放因子调整字体大小
        font_size = max(20, int(60 * scale_factor))
        draw.text((x1, y1 - int(25 * scale_factor)), label_text, 
                 font=get_font(font_size), fill=(color[2], color[1], color[0]))
        
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    
    @staticmethod
    def draw_person_region(frame, person_region, scale_x=1.0, scale_y=1.0, scale_factor=1.0):
        """
        绘制人员检测区域
        
        Args:
            frame: 输入图像帧
            person_region: 人员检测区域坐标 [x1, y1, x2, y2]
            scale_x (float): X轴缩放比例
            scale_y (float): Y轴缩放比例  
            scale_factor (float): 统一缩放因子
            
        Returns:
            绘制后的图像帧
        """
        if not person_region:
            return frame
            
        # 使用缩放比例调整人员检测区域坐标
        scaled_person_region = [
            int(person_region[0] * scale_x),
            int(person_region[1] * scale_y),
            int(person_region[2] * scale_x),
            int(person_region[3] * scale_y)
        ]
        
        # 根据缩放因子调整人员检测区域边框粗细
        region_thickness = max(1, int(2 * scale_factor))
        cv2.rectangle(frame, 
                    (scaled_person_region[0], scaled_person_region[1]),
                    (scaled_person_region[2], scaled_person_region[3]), 
                    (42, 42, 165), region_thickness)
        
        return frame