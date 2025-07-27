"""
Modbus 配置文件，用于存储 Modbus 通信的相关配置。
"""

# Modbus 服务器配置
MODBUS_HOST = "169.254.43.168"  # Modbus 服务器主机名或 IP 地址
MODBUS_PORT = 502               # Modbus 服务器端口
MODBUS_UNIT = 1                 # Modbus 从站单元标识符

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

# 连接重试配置
MAX_RECONNECT_ATTEMPTS = 10   # 最大重连尝试次数
MAX_RECONNECT_INTERVAL = 60   # 最大重连间隔（秒）

# 初始检测配置
INITIAL_DETECTION_CONFIG = {
    "大块检测": True,
    "异物检测": True,
    "人员越界检测": True,
    "跑偏检测": True
}

# 初始报警使能值
ALARM_ENABLE_INITIAL_VALUE = 0x0F  # 默认启用所有检测
