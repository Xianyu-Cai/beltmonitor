#!/usr/bin/env python3
import os
import time
from modbus_client import ModbusClient

# 强制使用localhost
os.environ['MODBUS_HOST'] = 'localhost'
os.environ['MODBUS_PORT'] = '502'
os.environ['MODBUS_UNIT'] = '1'

print("=== Modbus功能验证开始 ===")

client = ModbusClient()

if client.connect():
    print("[SUCCESS] 连接到Modbus服务器")
    
    # 测试1: 写入报警使能寄存器
    print("[TEST] 测试写入报警使能寄存器...")
    success = client.write_register(7, 15)  # 40008 = 所有检测启用
    print(f"写入结果: {success}")
    
    # 测试2: 读取报警使能状态
    print("[TEST] 测试读取报警使能状态...")
    status = client.get_alarm_enable_status()
    print(f"报警状态: {status}")
    
    # 测试3: 检查各检测类型启用状态
    print("[TEST] 测试各检测类型状态...")
    large = client.is_detection_enabled(0x01)
    foreign = client.is_detection_enabled(0x02)
    person = client.is_detection_enabled(0x04)
    deviation = client.is_detection_enabled(0x08)
    print(f"大块: {large}, 异物: {foreign}, 人员: {person}, 跑偏: {deviation}")
    
    # 测试4: 发送报警信号
    print("[TEST] 测试发送报警信号...")
    alarm_result = client.send_alarm("大块报警", 0.95, True)
    print(f"报警发送: {alarm_result}")
    
    # 测试5: 监控寄存器
    print("[TEST] 测试读取寄存器状态...")
    regs = client.monitor_registers()
    print(f"寄存器状态: {regs}")
    
    # 清理
    client.clear_all_alarms()
    client.disconnect()
    print("[SUCCESS] 测试完成，连接已关闭")
else:
    print("[ERROR] 无法连接到Modbus服务器")