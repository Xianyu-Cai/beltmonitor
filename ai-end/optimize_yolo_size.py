"""
YOLO模型尺寸优化器
解决YOLO输入尺寸必须为32的倍数的问题
"""
import math

def get_optimal_yolo_size(target_width, target_height, max_stride=32):
    """
    计算YOLO模型的最优输入尺寸
    
    Args:
        target_width: 目标宽度
        target_height: 目标高度
        max_stride: YOLO最大步长，默认为32
    
    Returns:
        tuple: (optimized_width, optimized_height)
    """
    
    def round_to_multiple(value, multiple):
        """将值四舍五入到最近的multiple的倍数"""
        return int(round(value / multiple) * multiple)
    
    # 计算最优尺寸
    opt_width = round_to_multiple(target_width, max_stride)
    opt_height = round_to_multiple(target_height, max_stride)
    
    # 保持宽高比
    aspect_ratio = target_width / target_height
    
    # 选择一个更接近原比例的尺寸
    candidates = []
    for w in [opt_width - max_stride, opt_width, opt_width + max_stride]:
        for h in [opt_height - max_stride, opt_height, opt_height + max_stride]:
            if w > 0 and h > 0:
                current_ratio = w / h
                ratio_diff = abs(current_ratio - aspect_ratio)
                candidates.append((w, h, ratio_diff))
    
    # 选择最接近原比例的尺寸
    candidates.sort(key=lambda x: x[2])
    best_width, best_height, _ = candidates[0]
    
    return best_width, best_height

def get_recommended_sizes():
    """获取推荐的YOLO尺寸"""
    return {
        "超高清": (1280, 736),   # 接近16:9的32倍数
        "高清": (960, 544),      # 接近16:9的32倍数
        "标清": (800, 480),      # 接近16:9的32倍数
        "流畅": (640, 384),      # 接近16:9的32倍数
        "低清": (512, 288),      # 接近16:9的32倍数
    }

def create_size_config():
    """创建尺寸配置文件"""
    config = {
        "yolo_requirements": {
            "max_stride": 32,
            "must_be_multiple_of": 32,
            "aspect_ratio_tolerance": 0.1
        },
        "recommended_sizes": get_recommended_sizes(),
        "current_optimization": {
            "original": (800, 450),
            "adjusted": (800, 480),
            "aspect_ratio_change": 6.7,  # 百分比变化
            "performance_impact": "minimal"
        }
    }
    
    return config

if __name__ == '__main__':
    print("🎯 YOLO尺寸优化器")
    print("=" * 50)
    
    # 测试当前配置
    original = (800, 450)
    optimized = get_optimal_yolo_size(*original)
    
    print(f"原始尺寸: {original}")
    print(f"优化尺寸: {optimized}")
    print(f"宽高比变化: {((optimized[0]/optimized[1]) - (original[0]/original[1]))/(original[0]/original[1])*100:.1f}%")
    
    print("\n📏 推荐YOLO尺寸:")
    for name, size in get_recommended_sizes().items():
        print(f"{name}: {size[0]}×{size[1]} (16:{round(size[1]/size[0]*16)})")
    
    # 创建配置文件
    config = create_size_config()
    
    import json
    with open('yolo_size_config.json', 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print("\n✅ 配置文件已创建: yolo_size_config.json")