import time
import threading
import logging
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ConnectionException, ModbusIOException

# 设置日志
logging.basicConfig()
log = logging.getLogger("ModbusClient")
log.setLevel(logging.INFO)

class ModbusClient:
    def __init__(self, host="169.254.43.168", port=502, unit=1, initial_config=None):
        """
        初始化 Modbus TCP 客户端
        
        Args:
            host (str): Modbus 服务器主机名或 IP 地址
            port (int): Modbus 服务器端口号
            unit (int): Modbus 从站单元标识符
            initial_config (dict): 初始检测配置
        """
        self.host = host
        self.port = port
        self.unit = unit
        self.client = None
        self.connected = False
        self.lock = threading.Lock()
        
        # 保存初始配置
        self.initial_config = initial_config or {}
        
        # 上次报警使能寄存器的值
        self.last_alarm_enable_value = None
        
        # 报警状态跟踪
        self.alarm_states = {
            "煤量报警": False,
            "跑偏报警": False,
            "大块报警": False,
            "烟雾报警": False,
            "人员越位报警": False,
            "异物报警": False
        }
        
        # 报警映射到保持寄存器地址（基于40001开始的地址）
        # 寄存器地址比显示的40001少1，因为Modbus地址是从0开始计数的
        self.alarm_register_addresses = {
            "煤量报警": 0,      # 40001
            "跑偏报警": 1,      # 40002
            "大块报警": 2,      # 40003
            "烟雾报警": 3,      # 40004
            "人员越位报警": 4,  # 40005
            "异物报警": 8       # 40009
        }
        
        # 报警使能寄存器地址
        self.alarm_enable_register = 7  # 40008
        
        # 连接和重连尝试的计数
        self.connection_attempts = 0
        self.last_connection_time = 0
        self.max_reconnect_interval = 60  # 最大重连间隔（秒）
        
        log.info(f"[Modbus] 初始化Modbus客户端: {host}:{port}, 单元: {unit}")
    
    def connect(self):
        """连接到 Modbus 服务器"""
        if self.connected:
            return True
            
        try:
            self.connection_attempts += 1
            self.last_connection_time = time.time()
            
            log.info(f"[Modbus] 尝试连接到 {self.host}:{self.port} (第 {self.connection_attempts} 次尝试)")
            self.client = ModbusTcpClient(self.host, port=self.port)
            self.connected = self.client.connect()
            
            if self.connected:
                log.info(f"[Modbus] 已成功连接到 {self.host}:{self.port}")
                # 重置计数器
                self.connection_attempts = 0
                
                # 打开报警使能
                self.enable_alarms()
                
                return True
            else:
                log.warning(f"[Modbus] 连接失败: {self.host}:{self.port}")
                return False
                
        except Exception as e:
            log.error(f"[Modbus错误] 连接时发生异常: {str(e)}")
            self.connected = False
            return False
    
    def disconnect(self):
        """断开与 Modbus 服务器的连接"""
        if self.client and self.connected:
            try:
                # 清除所有报警信号
                self.clear_all_alarms()
                
                self.client.close()
                log.info(f"[Modbus] 已断开与 {self.host}:{self.port} 的连接")
            except Exception as e:
                log.error(f"[Modbus错误] 断开连接时发生异常: {str(e)}")
            finally:
                self.connected = False
    
    def enable_alarms(self):
        """启用报警功能"""
        with self.lock:
            if not self.reconnect_if_needed():
                return False
                
            try:
                result = self.client.write_register(self.alarm_enable_register, 1)
                if hasattr(result, 'isError') and result.isError():
                    log.error(f"[Modbus错误] 启用报警失败: {result}")
                    return False
                log.info("[Modbus] 报警功能已启用")
                return True
            except Exception as e:
                log.error(f"[Modbus错误] 启用报警时发生异常: {str(e)}")
                self.connected = False
                return False
                
    def reconnect_if_needed(self):
        """如果需要，重新连接到 Modbus 服务器"""
        if not self.connected:
            # 计算重连的延迟时间（指数退避）
            current_time = time.time()
            time_since_last_attempt = current_time - self.last_connection_time
            
            # 指数退避，但最大不超过max_reconnect_interval
            backoff_time = min(2 ** min(self.connection_attempts, 5), self.max_reconnect_interval)
            
            if time_since_last_attempt >= backoff_time:
                return self.connect()
            return False
        return True
    
    def write_register(self, address, value):
        """
        写入单个保持寄存器
        
        Args:
            address (int): 寄存器地址
            value (int): 要写入的值 (0-65535)
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            if not self.reconnect_if_needed():
                return False
                
            try:
                # 确保值在有效范围内
                value = max(0, min(value, 65535))
                
                result = self.client.write_register(address, value)
                if hasattr(result, 'isError') and result.isError():
                    log.error(f"[Modbus错误] 写入寄存器 {address} 失败: {result}")
                    self.connected = False
                    return False
                
                # 验证写入是否成功
                verify_result = self.client.read_holding_registers(address, count=1)
                if hasattr(verify_result, 'isError') and not verify_result.isError():
                    if verify_result.registers[0] == value:
                        log.debug(f"[Modbus] 已成功写入寄存器 {address} = {value}")
                        return True
                    else:
                        log.warning(f"[Modbus警告] 寄存器 {address} 验证失败，期望值={value}, 实际值={verify_result.registers[0]}")
                        return False
                
                # 无法验证但写入没有报错
                return True
                
            except ConnectionException:
                log.error(f"[Modbus错误] 写入寄存器 {address} 时连接异常")
                self.connected = False
                return False
            except ModbusIOException as e:
                log.error(f"[Modbus错误] 写入寄存器 {address} 时IO异常: {str(e)}")
                return False
            except Exception as e:
                log.error(f"[Modbus错误] 写入寄存器 {address} 时发生未知异常: {str(e)}")
                return False
    
    def read_register(self, address):
        """
        读取单个保持寄存器
        
        Args:
            address (int): 寄存器地址
            
        Returns:
            int: 寄存器值，如果读取失败则返回None
        """
        with self.lock:
            if not self.reconnect_if_needed():
                return None
                
            try:
                result = self.client.read_holding_registers(address, count=1)
                if hasattr(result, 'isError') and result.isError():
                    log.error(f"[Modbus错误] 读取寄存器 {address} 失败: {result}")
                    return None
                    
                if hasattr(result, 'registers'):
                    value = result.registers[0]
                    log.debug(f"[Modbus] 读取寄存器 {address} = {value}")
                    return value
                return None
                
            except ConnectionException:
                log.error(f"[Modbus错误] 读取寄存器 {address} 时连接异常")
                self.connected = False
                return None
            except Exception as e:
                log.error(f"[Modbus错误] 读取寄存器 {address} 时发生异常: {str(e)}")
                return None
    
    def send_alarm(self, alarm_type, confidence=0.0, active=True):
        """
        发送报警信号
        
        Args:
            alarm_type (str): 报警类型名称
            confidence (float): 置信度 (0.0-1.0)
            active (bool): 报警是否激活
            
        Returns:
            bool: 操作是否成功
        """
        if alarm_type not in self.alarm_register_addresses:
            log.warning(f"[Modbus警告] 未知的报警类型: {alarm_type}")
            return False
            
        # 记录报警状态变化
        old_state = self.alarm_states.get(alarm_type, False)
        self.alarm_states[alarm_type] = active
        
        # 获取报警对应的寄存器地址
        register_address = self.alarm_register_addresses[alarm_type]
        
        # 将bool转换为int值
        value = 1 if active else 0
        
        # 对于煤量报警，使用置信度值 (0-1000)
        if alarm_type == "煤量报警" and active:
            value = int(confidence * 1000)
            log.info(f"[Modbus] 发送煤量报警: 值={value}, 置信度={confidence:.4f}")
        
        # 写入寄存器
        success = self.write_register(register_address, value)
        
        if success:
            if active and old_state != active:
                # 报警状态发生变化且为激活状态
                log.info(f"[Modbus] 已触发报警 {alarm_type}, 状态={active}, 置信度={confidence:.4f}")
            elif not active and old_state != active:
                # 报警状态发生变化且为取消状态
                log.info(f"[Modbus] 已解除报警 {alarm_type}")
        
        return success
    
    def clear_all_alarms(self):
        """清除所有报警"""
        all_success = True
        
        for alarm_type in self.alarm_states.keys():
            if self.alarm_states[alarm_type]:
                success = self.send_alarm(alarm_type, 0.0, False)
                all_success = all_success and success
                
        if all_success:
            log.info("[Modbus] 已清除所有报警信号")
        else:
            log.warning("[Modbus警告] 清除报警信号时部分操作失败")
            
        return all_success
    
    def monitor_registers(self):
        """监控所有寄存器，可用于调试"""
        if not self.reconnect_if_needed():
            return None
        
        try:
            registers = {}
            # 一次性读取多个寄存器
            result = self.client.read_holding_registers(0, count=10)
            if not hasattr(result, 'isError') or not result.isError():
                for i, value in enumerate(result.registers):
                    register_address = 40001 + i  # 显示的地址从40001开始
                    registers[register_address] = value
                
                log.info(f"[Modbus] 当前寄存器状态: {registers}")
                return registers
            else:
                log.error(f"[Modbus错误] 监控寄存器失败: {result}")
                return None
        except Exception as e:
            log.error(f"[Modbus错误] 监控寄存器时发生异常: {str(e)}")
            return None

    def get_alarm_enable_status(self):
        """
        获取报警使能状态
        
        Returns:
            dict: 检测配置字典
        """
        enable_value = self.read_register(self.alarm_enable_register)
        if enable_value is not None:
            self.last_alarm_enable_value = enable_value
            return {
                "大块检测": bool(enable_value & 0x01),
                "异物检测": bool(enable_value & 0x02),
                "人员越界检测": bool(enable_value & 0x04),
                "跑偏检测": bool(enable_value & 0x08)
            }
        return None

    def check_detection_change(self):
        """
        检查检测配置是否有变化
        
        Returns:
            dict or None: 如果有变化，返回新的配置字典；否则返回None
        """
        current_value = self.read_register(self.alarm_enable_register)
        if current_value is not None and current_value != self.last_alarm_enable_value:
            self.last_alarm_enable_value = current_value
            return {
                "大块检测": bool(current_value & 0x01),
                "异物检测": bool(current_value & 0x02),
                "人员越界检测": bool(current_value & 0x04),
                "跑偏检测": bool(current_value & 0x08)
            }
        return None

    def is_detection_enabled(self, detection_mask):
        """
        检查特定检测类型是否启用
        
        Args:
            detection_mask (int): 检测类型的位掩码
            
        Returns:
            bool: 是否启用
        """
        enable_value = self.read_register(self.alarm_enable_register)
        if enable_value is not None:
            return bool(enable_value & detection_mask)
        return True  # 如果无法读取，默认启用
