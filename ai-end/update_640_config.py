#!/usr/bin/env python3
"""
统一640×352 YOLO配置更新工具
将输入输出统一为YOLO兼容的640×352尺寸
"""
import os
import re

def update_file_dimensions(file_path, old_width, old_height, new_width, new_height):
    """更新文件中的尺寸配置"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 更新尺寸配置
    patterns = [
        (r'\btarget_width\s*=\s*\d+', f'target_width = {new_width}'),
        (r'\btarget_height\s*=\s*\d+', f'target_height = {new_height}'),
        (r'"\d+x\d+"', f'"{new_width}x{new_height}"'),
        (r"'\d+x\d+'", f"'{new_width}x{new_height}'"),
    ]
    
    updated_content = content
    for pattern, replacement in patterns:
        updated_content = re.sub(pattern, replacement, updated_content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"✅ 已更新: {file_path}")

def create_640_config():
    """创建640×352统一配置"""
    
    config = {
        "unified_dimensions": {
            "width": 640,
            "height": 352,
            "yolo_compatible": True,
            "640_div_32": 20,
            "352_div_32": 11
        },
        "aspect_ratio": {
            "original_16_9": 1.777,
            "optimized_640_352": 1.818,
            "difference_percent": 2.3
        },
        "performance": {
            "pixels_640_352": 225280,
            "pixels_800_480": 384000,
            "reduction_percent": 41.3
        }
    }
    
    return config

def main():
    print("🎯 统一640×352配置更新")
    print("=" * 50)
    
    # 验证兼容性
    width, height = 640, 352
    print(f"尺寸: {width}×{height}")
    print(f"640÷32 = {width//32}")
    print(f"352÷32 = {height//32}")
    print(f"YOLO兼容: {'✅' if width%32==0 and height%32==0 else '❌'}")
    
    # 创建配置
    config = create_640_config()
    
    # 保存配置
    import json
    with open('640_config.json', 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 性能优化:")
    print(f"像素减少: {config['performance']['reduction_percent']:.1f}%")
    print(f"宽高比变化: {config['aspect_ratio']['difference_percent']:.1f}%")
    
    print(f"\n✅ 配置文件已创建: 640_config.json")

if __name__ == '__main__':
    main()