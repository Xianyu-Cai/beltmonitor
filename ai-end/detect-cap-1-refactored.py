#!/usr/bin/env python3
"""
Refactored main detection script with modular architecture.
Maintains all original functionality while improving code organization.
"""

import warnings
import threading
import signal
import sys
import shutil
import logging

# 忽略警告
warnings.filterwarnings('ignore')

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 导入自定义模块
from config_manager import config_manager
from event_reporter import EventReporter
from modbus_client import ModbusClient
from core.detection_engine import DetectionEngine, create_flask_server

# 全局变量，用于捕获退出信号
exit_event = threading.Event()

# 全局变量，用于跟踪检测任务的启用状态
detection_config = {
    "大块检测": True,  # 对应bit0
    "异物检测": True,  # 对应bit1
    "人员越界检测": True,  # 对应bit2
    "跑偏检测": True   # 对应bit3
}

# Modbus位掩码常量
DETECT_LARGE_CHUNK = 0x01    # bit0 - 大块
DETECT_FOREIGN_OBJECT = 0x02  # bit1 - 异物
DETECT_PERSONNEL = 0x04      # bit2 - 人员越界
DETECT_DEVIATION = 0x08      # bit3 - 跑偏


def monitor_alarm_enable_register(modbus_client, detection_engine):
    """
    监控Modbus报警使能寄存器的变化，并相应地更新检测配置
    """
    global detection_config
    logger.info("[Modbus] 开始监控报警使能寄存器...")
    
    # 首次获取当前状态
    status = modbus_client.get_alarm_enable_status()
    if status:
        # 更新全局配置
        detection_config.update(status)
        detection_engine.update_detection_config(detection_config)
        logger.info(f"[Modbus] 初始检测配置：{detection_config}")
    
    # 持续监控变化
    while not exit_event.is_set():
        try:
            # 检查报警使能寄存器是否有变化
            status_change = modbus_client.check_detection_change()
            if status_change:
                # 报警使能寄存器有变化，更新配置
                old_config = detection_config.copy()
                detection_config.update(status_change)
                
                # 输出变化详情
                logger.info(f"[Modbus] 检测配置已更新：")
                for key in status_change:
                    if key in old_config and old_config[key] != status_change[key]:
                        state = "启用" if status_change[key] else "禁用"
                        logger.info(f"  - {key}: {state}")
                
                # 更新检测引擎配置
                detection_engine.update_detection_config(detection_config)
                logger.info(f"[Modbus] 当前检测配置: {detection_config}")
            
            # 短暂休眠，避免频繁读取
            import time
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"[Modbus错误] 监控报警使能寄存器时发生异常: {str(e)}")
            import traceback
            traceback.print_exc()
            import time
            time.sleep(5)  # 出错后稍等长一点再重试


def run_flask_server(coal_tracker, hls_dir, host='0.0.0.0', port=2022, camera_id=None):
    """
    运行Flask服务器
    
    Args:
        coal_tracker: 煤量追踪器实例
        hls_dir (str): HLS目录
        host (str): 主机地址
        port (int): 端口号
        camera_id (int, optional): 摄像头ID
    """
    app = create_flask_server(coal_tracker, hls_dir, camera_id)
    
    if camera_id:
        logger.info(f"[HLS服务器] 已启动，摄像头ID: {camera_id}, 地址: http://{host}:{port}/hls_output/")
        logger.info(f"[煤量接口] 已启动，地址: http://{host}:{port}/api/coal_quantity")
    else:
        logger.info(f"[HLS服务器] 已启动，地址: http://{host}:{port}/hls_output/")
    
    try:
        app.run(host=host, port=port, threaded=True)
    except OSError as e:
        logger.error(f"[错误] 无法在端口 {port} 启动服务器: {e}")
        # 尝试使用备用端口
        fallback_port = port + 1000
        logger.info(f"[尝试] 在备用端口 {fallback_port} 上启动服务器")
        try:
            app.run(host=host, port=fallback_port, threaded=True)
            logger.info(f"[成功] 服务器已在端口 {fallback_port} 上启动")
        except Exception as e2:
            logger.error(f"[严重错误] 无法启动服务器: {e2}")


def signal_handler(sig, frame):
    """信号处理器"""
    logger.info(f"[信号处理] 接收到信号 {sig}，正在设置退出事件...")
    exit_event.set()


def initialize_modbus_client():
    """
    初始化Modbus客户端
    
    Returns:
        ModbusClient实例
    """
    global detection_config
    
    try:
        from modbus_config import (
            MODBUS_HOST, MODBUS_PORT, MODBUS_UNIT, 
            INITIAL_DETECTION_CONFIG, ALARM_ENABLE_INITIAL_VALUE
        )
        
        # 打印Modbus初始配置
        logger.info(f"[Modbus] 初始配置:")
        logger.info(f"  - 主机: {MODBUS_HOST}:{MODBUS_PORT}")
        logger.info(f"  - 单元: {MODBUS_UNIT}")
        logger.info(f"  - 初始报警使能值: 0x{ALARM_ENABLE_INITIAL_VALUE:02X}")
        logger.info(f"  - 初始检测配置: {INITIAL_DETECTION_CONFIG}")
        
        # 更新全局检测配置
        detection_config.update(INITIAL_DETECTION_CONFIG)
        
        modbus_client = ModbusClient(
            host=MODBUS_HOST, 
            port=MODBUS_PORT, 
            unit=MODBUS_UNIT,
            initial_config=INITIAL_DETECTION_CONFIG
        )
        
        # 尝试连接 Modbus 服务器
        modbus_connected = modbus_client.connect()
        if modbus_connected:
            logger.info(f"[Modbus] 已成功连接到PLC: {MODBUS_HOST}:{MODBUS_PORT}")
        else:
            logger.warning(f"[Modbus警告] 无法连接到PLC: {MODBUS_HOST}:{MODBUS_PORT}, 将在运行时自动重试")
            logger.info(f"[Modbus] 使用初始配置: {INITIAL_DETECTION_CONFIG}")
        
        return modbus_client
        
    except ImportError:
        logger.warning("[Modbus警告] 未找到modbus_config.py，使用默认的Modbus配置")
        return ModbusClient()  # 使用默认配置
    except Exception as e:
        logger.error(f"[Modbus错误] 初始化Modbus客户端失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return ModbusClient()


def main():
    """主函数"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("[DEBUG] Script starting up...")
    
    # 使用配置管理器解析参数
    args = config_manager.parse_args()
    
    # 检查必要参数
    if not args.source:
        logger.error("Error: --source parameter is required")
        sys.exit(1)
    
    # 初始化 Modbus 客户端
    modbus_client = initialize_modbus_client()
    
    # 初始化事件上报器
    event_reporter = None
    if not args.cameraid:
        logger.warning("警告: 未提供摄像头ID (--cameraid)，事件上报功能将被禁用")
    else:
        event_reporter = EventReporter(base_url=config_manager.base_url)
        
        # 设置事件冷却时间（如果指定）
        if hasattr(args, 'cooldown') and args.cooldown is not None:
            event_reporter.set_cooldown_period(args.cooldown)
            logger.info(f"[配置] 设置事件冷却时间为 {args.cooldown} 分钟")
    
    # 解析类别ID
    class_ids = [int(cid) for cid in args.class_id.split(',')] if args.class_id.strip() else list(range(8))
    
    # 检查ffmpeg是否安装
    if not shutil.which('ffmpeg'):
        logger.error("FFmpeg is not installed or not found in PATH.")
        sys.exit(1)
    
    # 初始化检测引擎
    detection_engine = DetectionEngine(
        config_manager=config_manager,
        event_reporter=event_reporter,
        modbus_client=modbus_client
    )
    
    if not detection_engine.initialize(args):
        logger.error("检测引擎初始化失败")
        sys.exit(1)
    
    # 确定HLS服务器端口
    if args.cameraid:
        hls_actual_port = 2000 + int(args.cameraid)
    else:
        hls_actual_port = 2022  # 默认HLS端口
    
    logger.info(f"[DEBUG] main: HLS actual port determined as: {hls_actual_port}")
    
    # 启动Flask服务器
    flask_thread = threading.Thread(
        target=run_flask_server,
        args=(detection_engine.coal_tracker, args.hls_dir, '0.0.0.0', hls_actual_port, args.cameraid),
        daemon=True
    )
    flask_thread.start()
    
    if args.cameraid:
        logger.info(f"[煤量接口] 为摄像头 {args.cameraid} 启动接口，端口: {hls_actual_port}")
    
    # 启动Modbus监控线程（如果连接成功）
    modbus_monitor_thread = None
    if modbus_client.connected:
        modbus_monitor_thread = threading.Thread(
            target=monitor_alarm_enable_register,
            args=(modbus_client, detection_engine),
            daemon=True
        )
        modbus_monitor_thread.start()
        logger.info("[Modbus] 报警使能监控线程已启动")
    
    try:
        # 开始实时检测
        detection_engine.start_detection(args, class_ids, hls_actual_port)
    except KeyboardInterrupt:
        logger.info("Interrupted by user.")
    finally:
        # 停止检测引擎
        detection_engine.stop()
        
        # 关闭 Modbus 连接
        if modbus_client:
            modbus_client.disconnect()
        
        logger.info("程序已退出")


if __name__ == '__main__':
    main()