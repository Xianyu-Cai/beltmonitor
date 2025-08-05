"""
Modbus 配置文件，用于存储 Modbus 通信的相关配置。
使用环境变量以增强安全性和灵活性
"""
import os

# Modbus 服务器配置
MODBUS_HOST = os.getenv('MODBUS_HOST', 'localhost')  # 默认localhost
MODBUS_PORT = int(os.getenv('MODBUS_PORT', '502'))   # 默认502端口
MODBUS_UNIT = int(os.getenv('MODBUS_UNIT', '1'))     # 默认单元1

# 报警寄存器地址映射 (以40001开始的寄存器地址为基准)
ALARM_REGISTER_ADDRESSES = {
    "煤量报警": 0,      # 40001
    "跑偏报警": 1,      # 40002
    "大块报警": 2,      # 40003
    "烟雾报警": 3,      # 40004
    "人员越位报警": 4,  # 40005
    "异物报警": 8       # 40009
}

# 报警使能寄存器地址
ALARM_ENABLE_REGISTER = 7  # 40008

# 报警类型与报警规则ID的映射
ALARM_RULE_MAPPING = {
    "煤量报警": 4,
    "跑偏报警": 5,
    "大块报警": 3,
    "烟雾报警": 6,
    "人员越位报警": 1,
    "异物报警": 2
}

# 检测配置常量
INITIAL_DETECTION_CONFIG = {
    "大块检测": True,
    "异物检测": True,
    "人员越界检测": True,
    "跑偏检测": True
}

# 报警使能初始值（所有检测启用）
ALARM_ENABLE_INITIAL_VALUE = 0x0F  # bit0-3全部置1

# 连接重试配置
MAX_RECONNECT_ATTEMPTS = 10   # 最大重连尝试次数
MAX_RECONNECT_INTERVAL = 60   # 最大重连间隔（秒）
