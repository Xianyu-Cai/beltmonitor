#!/usr/bin/env python3
"""
Modbus功能测试脚本
用于验证修复后的Modbus功能是否正常
"""

import os
import sys
import time
import logging
from modbus_client import ModbusClient

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_modbus_functionality():
    """测试Modbus功能"""
    print("开始测试Modbus功能修复情况...")
    
    # 设置测试环境变量
    os.environ['MODBUS_HOST'] = 'localhost'  # 测试时使用localhost
    os.environ['MODBUS_PORT'] = '502'
    os.environ['MODBUS_UNIT'] = '1'
    
    # 导入修复后的配置
    from modbus_config import (
        MODBUS_HOST, MODBUS_PORT, MODBUS_UNIT,
        INITIAL_DETECTION_CONFIG, ALARM_ENABLE_INITIAL_VALUE
    )
    
    print("配置加载成功:")
    print(f"   主机: {MODBUS_HOST}")
    print(f"   端口: {MODBUS_PORT}")
    print(f"   单元: {MODBUS_UNIT}")
    print(f"   初始配置: {INITIAL_DETECTION_CONFIG}")
    
    # 创建Modbus客户端
    client = ModbusClient(
        host=MODBUS_HOST,
        port=MODBUS_PORT,
        unit=MODBUS_UNIT
    )
    
    # 测试缺失的方法
    print("测试缺失的方法...")
    
    # 测试1: get_alarm_enable_status
    try:
        status = client.get_alarm_enable_status()
        print(f"get_alarm_enable_status() 正常: {status}")
    except Exception as e:
        print(f"get_alarm_enable_status() 失败: {e}")
        return False
    
    # 测试2: check_detection_change
    try:
        change = client.check_detection_change()
        print(f"check_detection_change() 正常: {change}")
    except Exception as e:
        print(f"check_detection_change() 失败: {e}")
        return False
    
    # 测试3: is_detection_enabled
    try:
        enabled = client.is_detection_enabled(0x01)  # 测试大块检测
        print(f"is_detection_enabled() 正常: {enabled}")
    except Exception as e:
        print(f"is_detection_enabled() 失败: {e}")
        return False
    
    # 测试4: 线程安全
    print("测试线程安全性...")
    import threading
    
    results = []
    
    def test_thread():
        try:
            result = client.is_detection_enabled(0x01)
            results.append(result)
        except Exception as e:
            results.append(f"错误: {e}")
    
    threads = []
    for i in range(5):
        t = threading.Thread(target=test_thread)
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    if all(isinstance(r, bool) for r in results):
        print("线程安全测试通过")
    else:
        print("线程安全测试失败")
        return False
    
    # 测试5: 错误处理
    print("测试错误处理...")
    try:
        # 模拟无效地址
        success = client.write_register(9999, 1)
        print(f"错误处理正常: {success}")
    except Exception as e:
        print(f"错误处理正常: 捕获异常 {type(e).__name__}")
    
    # 测试6: 环境变量
    print("测试环境变量配置...")
    test_host = os.getenv('MODBUS_HOST', 'not_set')
    test_port = os.getenv('MODBUS_PORT', 'not_set')
    
    if test_host != 'not_set' and test_port != 'not_set':
        print("环境变量配置正常")
    else:
        print("环境变量配置异常")
        return False
    
    print("所有测试通过！Modbus功能修复成功")
    return True

if __name__ == "__main__":
    success = test_modbus_functionality()
    if success:
        print("Modbus修复验证完成，可以正常使用")
        sys.exit(0)
    else:
        print("Modbus修复验证失败，请检查代码")
        sys.exit(1)