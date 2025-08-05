#!/usr/bin/env python3
import os
from modbus_client import ModbusClient

# 设置测试环境
os.environ['MODBUS_HOST'] = 'localhost'
os.environ['MODBUS_PORT'] = '502'
os.environ['MODBUS_UNIT'] = '1'

print("=== 煤量数据发送测试 ===")

client = ModbusClient()

if client.connect():
    print("连接成功!")
    
    # 测试发送不同煤量数据
    test_values = [25.5, 67.8, 89.2, 15.0, 98.5]
    
    for value in test_values:
        print(f"发送煤量数据: {value}%")
        result = client.send_coal_quantity(value)
        print(f"发送结果: {result}")
        
        # 读取验证
        coal_value = client.read_register(0)  # 40001寄存器
        print(f"寄存器40001当前值: {coal_value}")
        print("-" * 30)
    
    client.disconnect()
    print("测试完成!")
else:
    print("连接失败")