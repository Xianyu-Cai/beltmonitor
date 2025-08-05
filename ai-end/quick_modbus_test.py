#!/usr/bin/env python3
"""
快速Modbus功能验证脚本
"""
import os
import time
from modbus_client import ModbusClient

# 设置测试环境
os.environ['MODBUS_HOST'] = 'localhost'
os.environ['MODBUS_PORT'] = '502'
os.environ['MODBUS_UNIT'] = '1'

def test_modbus_connection():
    """测试Modbus连接和功能"""
    print("开始Modbus功能验证...")
    
    client = ModbusClient()
    
    # 测试连接
    if client.connect():
        print("✅ Modbus连接成功!")
        
        # 测试写入报警使能寄存器
        success = client.write_register(7, 0x0F)  # 40008寄存器，启用所有检测
        if success:
            print("✅ 报警使能寄存器写入成功")
        else:
            print("❌ 报警使能寄存器写入失败")
        
        # 测试读取报警使能寄存器
        status = client.get_alarm_enable_status()
        if status:
            print(f"✅ 报警使能状态: {status}")
        else:
            print("❌ 无法读取报警使能状态")
        
        # 测试检测状态检查
        large_detect = client.is_detection_enabled(0x01)
        foreign_detect = client.is_detection_enabled(0x02)
        print(f"✅ 大块检测启用: {large_detect}")
        print(f"✅ 异物检测启用: {foreign_detect}")
        
        # 测试发送报警
        alarm_success = client.send_alarm("大块报警", 0.85, True)
        if alarm_success:
            print("✅ 报警信号发送成功")
        else:
            print("❌ 报警信号发送失败")
        
        # 监控寄存器状态
        registers = client.monitor_registers()
        if registers:
            print(f"✅ 当前寄存器状态: {registers}")
        
        # 清除报警
        client.clear_all_alarms()
        print("✅ 所有报警已清除")
        
        client.disconnect()
        print("✅ 连接已关闭")
        return True
    else:
        print("❌ 无法连接到Modbus服务器")
        return False

if __name__ == "__main__":
    test_modbus_connection()