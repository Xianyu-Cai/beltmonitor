import warnings
import argparse
from ultralytics import YOLO
import os
import cv2
import subprocess
import threading
from flask import Flask, send_from_directory, jsonify
import sys
from flask_cors import CORS
import requests
import json
import time
import queue
import base64
import signal
import mysql.connector
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import yaml

# 导入自定义模块
from config_manager import config_manager
from alarm_type_mapper import AlarmTypeMapper
from event_reporter import EventReporter
from modbus_client import ModbusClient

# 忽略警告
warnings.filterwarnings('ignore')

# 全局变量，用于捕获退出信号
exit_event = threading.Event()

# 全局变量，用于跟踪检测任务的启用状态
detection_config = {
    "大块检测": True,  # 对应bit0
    "异物检测": True,  # 对应bit1
    "人员越界检测": True,  # 对应bit2
    "跑偏检测": True   # 对应bit3
}

# 检测类型到类别ID的映射
detection_type_to_class_ids = {
    "大块检测": [2],         # 大块对应类别ID 2
    "异物检测": [5],         # 异物对应类别ID 5
    "人员越界检测": [6],     # 人员对应类别ID 6
    "跑偏检测": [3, 4]       # 跑偏对应类别ID 3和4（左轴和右轴）
}

# Modbus位掩码常量
DETECT_LARGE_CHUNK = 0x01    # bit0 - 大块
DETECT_FOREIGN_OBJECT = 0x02  # bit1 - 异物
DETECT_PERSONNEL = 0x04      # bit2 - 人员越界
DETECT_DEVIATION = 0x08      # bit3 - 跑偏

# 类别名称和颜色定义
CLASS_NAMES = {
    0: "皮带", 1: "煤量", 2: "大块", 3: "左轴",
    4: "右轴", 5: "异物", 6: "人员", 7: "烟雾"
}

CLASS_COLORS = {
    0: (0, 255, 0), 1: (0, 0, 255), 2: (255, 0, 0),
    3: (0, 255, 255), 4: (255, 255, 0), 5: (255, 0, 255),
    6: (255, 165, 0), 7: (128, 128, 128)
}

print("[DEBUG] Script starting up...") # 添加启动调试信息

def get_font(size=60, font_path=None):
    try:
        font_path = font_path or "./WenJinMincho-TTF.ttc"
        return ImageFont.truetype(font_path, size)
    except IOError:
        return ImageFont.load_default()

class Drawer:
    @staticmethod
    def draw(frame, box, label, ratio=None, scale_factor=1.0):
        # 根据缩放因子调整锚框坐标
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        
        # 如果需要，可以根据scale_factor调整锚框线条粗细
        line_thickness = max(1, int(2 * scale_factor))
        
        cls = int(box.cls[0])
        color = CLASS_COLORS.get(cls, (255, 255, 255))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, line_thickness)
        
        label_text = f"{label}{f': {ratio}' if cls == 1 and ratio else ''}"
        pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil_img)
        
        # 根据缩放因子调整字体大小
        font_size = max(20, int(60 * scale_factor))
        draw.text((x1, y1 - int(25 * scale_factor)), label_text, font=get_font(font_size), fill=(color[2], color[1], color[0]))
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

# 用于连接 MySQL 的函数
def update_camera_rtsp_url(camera_id, rtsp_url):
    connection = None
    try:
        connection = mysql.connector.connect(
            host="localhost",  # 数据库主机
            user="root",  # 数据库用户名
            password="123456",  # 数据库密码
            database="beltmonitor",  # 数据库名称
            auth_plugin='mysql_native_password'  # 使用兼容的身份验证插件
        )
        
        cursor = connection.cursor()
        
        # 更新查询语句
        update_query = """
            UPDATE camera
            SET rtspUrl = %s
            WHERE id = %s
        """
        
        cursor.execute(update_query, (rtsp_url, camera_id))
        
        # 提交更新
        connection.commit()
        
        print(f"[数据库] RTSP URL已更新，摄像头ID={camera_id}，地址={rtsp_url}")
        
    except mysql.connector.Error as err:
        print(f"[数据库错误] {err}")
    finally:
        if connection:
            cursor.close()
            connection.close()
            
    # 使用API更新（作为备用方案）
    try:
        # 构建API URL
        api_url = f"http://localhost:8080/api/admin/updateCamera"
        
        # 准备数据 - 修改参数名称从cameraID为id
        data = {
            "id": camera_id,
            "rtspUrl": rtsp_url
        }
        
        # 发送请求
        response = requests.post(api_url, json=data)
        
        # 检查响应
        if response.status_code == 200:
            print(f"[API] RTSP URL已通过API更新，摄像头ID={camera_id}")
        else:
            print(f"[API警告] 通过API更新RTSP URL失败，状态码：{response.status_code}")
            
    except Exception as e:
        print(f"[API错误] 通过API更新RTSP URL时出错：{e}")

# 新增函数: 更新摄像头HLS流地址
def update_camera_hls_url(camera_id, hls_url):
    connection = None
    try:
        connection = mysql.connector.connect(
            host="localhost",  # 数据库主机
            user="root",  # 数据库用户名
            password="123456",  # 数据库密码
            database="beltmonitor",  # 统一使用相同的数据库名称
            auth_plugin='mysql_native_password'  # 使用兼容的身份验证插件
        )
        
        cursor = connection.cursor()
        
        # 更新查询语句
        update_query = """
            UPDATE camera
            SET hlsUrl = %s
            WHERE id = %s
        """
        
        cursor.execute(update_query, (hls_url, camera_id))
        
        # 提交更新
        connection.commit()
        
        print(f"[数据库] HLS URL已更新，摄像头ID={camera_id}，地址={hls_url}")
        
    except mysql.connector.Error as err:
        print(f"[数据库错误] {err}")
    finally:
        if connection:
            cursor.close()
            connection.close()
            
    # 使用API更新（作为备用方案）
    try:
        # 构建API URL
        api_url = f"http://localhost:8080/api/admin/updateCamera"
        
        # 准备数据 - 修改参数名称从cameraID为id
        data = {
            "id": camera_id,
            "hlsUrl": hls_url
        }
        
        # 发送请求
        headers = {"Content-Type": "application/json"}
        response = requests.post(api_url, json=data, headers=headers)
        
        # 检查响应
        if response.status_code == 200 or response.status_code == 201: # 将201视为成功
            print(f"[API] HLS URL已通过API更新，摄像头ID={camera_id}, 状态码: {response.status_code}")
        else:
            print(f"[API警告] 通过API更新HLS URL失败，状态码：{response.status_code}")
            if hasattr(response, 'text'):
                print(f"[API响应内容] {response.text}")
            
    except Exception as e:
        print(f"[API错误] 通过API更新HLS URL时出错：{e}")

def generate_hls_stream(camera_id, frame):
    """
    为特定摄像头生成HLS流
    """
    output_dir = 'hls_output'
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建HLS输出文件路径
    hls_path = f"{output_dir}/{camera_id}"
    m3u8_name = f"{camera_id}.m3u8"
    hls_url = f"http://localhost:2022/hls_output/{m3u8_name}"
    
    # 确保摄像头HLS目录存在
    os.makedirs(hls_path, exist_ok=True)
    
    # 为该摄像头设置FFmpeg命令
    ffmpeg_cmd = [
        'ffmpeg',
        '-y',  # 覆盖已存在的文件
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-pix_fmt', 'bgr24',
        '-s', f"{frame.shape[1]}x{frame.shape[0]}",  # 宽x高
        '-r', '25',  # 帧率
        '-i', '-',  # 从stdin读取
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments',
        f"{hls_path}/{m3u8_name}"
    ]
    
    # 使用subprocess处理视频帧并创建HLS流
    try:
        process = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)
        if process.stdin is not None:
            process.stdin.write(frame.tobytes())
            process.stdin.flush()
        else:
            print(f"[错误] FFmpeg进程的stdin为None")
            return None
        
        # 更新数据库中的HLS URL
        update_camera_hls_url(camera_id, hls_url)
        
        return process
    except Exception as e:
        print(f"[错误] 生成HLS流失败: {e}")
        return None

def start_ffmpeg(output_dir, output_filename, width, height, fps, camera_id=None, hls_server_actual_port=None):
    """
    启动ffmpeg进程，将视频流转换为HLS格式
    
    Args:
        output_dir: 输出目录
        output_filename: 输出文件名
        width: 视频宽度
        height: 视频高度
        fps: 帧率
        camera_id: 摄像头ID，用于创建特定摄像头的输出目录
        hls_server_actual_port: HLS服务器实际监听的端口
    
    Returns:
        subprocess.Popen: ffmpeg进程
        str: HLS流的URL
    """
    # 如果提供了摄像头ID，则为该摄像头创建单独的目录
    if camera_id is not None:
        camera_output_dir = os.path.join(output_dir, f"camera_{camera_id}")
        os.makedirs(camera_output_dir, exist_ok=True)
        output_path = os.path.join(camera_output_dir, output_filename)
    else:
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)
    
    command = [
        'ffmpeg',
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-pix_fmt', 'bgr24',
        '-s', f'{width}x{height}',
        '-r', str(fps),
        '-i', '-',  # 从标准输入读取视频
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments',
        output_path
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    
    # 使用传入的实际HLS服务器端口构建URL
    if camera_id and hls_server_actual_port:
        hls_url = f"http://localhost:{hls_server_actual_port}/hls_output/camera_{camera_id}/{output_filename}"
        print(f"[DEBUG] start_ffmpeg: Generated HLS URL for camera {camera_id}: {hls_url}")
    elif hls_server_actual_port: # 无camera_id但有端口（通用服务器）
        hls_url = f"http://localhost:{hls_server_actual_port}/hls_output/{output_filename}"
        print(f"[DEBUG] start_ffmpeg: Generated HLS URL (generic): {hls_url}")
    else:
        # 保留一个默认的回退，但理想情况下 hls_server_actual_port 应该总是被提供
        default_port = 2022
        hls_url = f"http://localhost:{default_port}/hls_output/{output_filename}"
        print(f"[DEBUG] start_ffmpeg: Using fallback HLS URL: {hls_url}")
        
    return process, hls_url

def send_alarm_event_worker(event_queue, upper_computer_url, api_key=None):
    while not exit_event.is_set():
        try:
            event_data = event_queue.get(timeout=1)
        except queue.Empty:
            continue
        if event_data is None:
            break
        send_alarm_event_to_upper_computer(event_data, upper_computer_url, api_key)
        event_queue.task_done()

def send_alarm_event_to_upper_computer(event_data, upper_computer_url, api_key=None):
    try:
        headers = {'Content-Type': 'application/json'}
        if api_key:
            headers['Authorization'] = f'Bearer {api_key}'
        response = requests.post(upper_computer_url, data=json.dumps(event_data), headers=headers, timeout=5)
        if response.status_code == 200:
            print(f"Successfully sent event to upper computer: EventID={event_data.get('eventID')}")
        else:
            print(f"Failed to send event. Status Code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"Error sending event to upper computer: {e}")

# 监控Modbus报警使能寄存器变化的函数
def monitor_alarm_enable_register(modbus_client):
    """
    监控Modbus报警使能寄存器的变化，并相应地更新检测配置
    """
    global detection_config
    print("[Modbus] 开始监控报警使能寄存器...")
    
    # 首次获取当前状态
    status = modbus_client.get_alarm_enable_status()
    if status:
        # 更新全局配置
        detection_config.update(status)
        print(f"[Modbus] 初始检测配置：{detection_config}")
    
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
                print(f"[Modbus] 检测配置已更新：")
                for key in status_change:
                    if key in old_config and old_config[key] != status_change[key]:
                        state = "启用" if status_change[key] else "禁用"
                        print(f"  - {key}: {state}")
                
                # 确认更新后的配置
                print(f"[Modbus] 当前检测配置: {detection_config}")
            
            # 短暂休眠，避免频繁读取
            time.sleep(1)
            
        except Exception as e:
            print(f"[Modbus错误] 监控报警使能寄存器时发生异常: {str(e)}")
            import traceback
            traceback.print_exc()
            time.sleep(5)  # 出错后稍等长一点再重试

# 直接获取最新的检测配置，确保实时应用最新状态
def should_detect_class(cls_id):
    """
    根据当前检测配置，判断是否应该检测指定类别
    
    Args:
        cls_id (int): 类别ID
        
    Returns:
        bool: 如果该类别当前应该被检测，则返回True，否则返回False
    """
    global detection_config, modbus_client
    
    # 特殊类别，总是检测（皮带和煤量）
    if cls_id in [0, 1]:
        return True
    
    # 如果modbus_client可用，直接查询最新状态
    if 'modbus_client' in globals() and modbus_client and modbus_client.connected: # 检查连接状态 (修正: is_connected -> connected)
        try:
            # 检查 is_detection_enabled 方法是否存在
            if not hasattr(modbus_client, 'is_detection_enabled'):
                # print(f"[DEBUG] ModbusClient lacks 'is_detection_enabled'. Falling back to cached config for class {cls_id}.")
                pass # Fall through to cached config if method missing
            elif cls_id == 2:  # 大块
                return modbus_client.is_detection_enabled(DETECT_LARGE_CHUNK)
            elif cls_id == 5:  # 异物
                return modbus_client.is_detection_enabled(DETECT_FOREIGN_OBJECT)
            elif cls_id == 6:  # 人员
                return modbus_client.is_detection_enabled(DETECT_PERSONNEL)
            elif cls_id in [3, 4]:  # 跑偏
                return modbus_client.is_detection_enabled(DETECT_DEVIATION)
        except AttributeError: #显式捕获AttributeError
            print(f"[错误] ModbusClient 实例缺少 'is_detection_enabled' 方法。将使用缓存的检测配置。")
        except Exception as e:
            print(f"[错误] 获取Modbus检测启用状态时出错: {str(e)}。将使用缓存的检测配置。")
            # 如果出错，回退到使用缓存的配置
    
    # 使用缓存的配置
    for detection_type, class_ids_list in detection_type_to_class_ids.items(): # 重命名变量避免冲突
        if cls_id in class_ids_list:
            should = detection_config.get(detection_type, True)
            # print(f"[DEBUG] Cached check: class_id={cls_id}, detection_type={detection_type}, enabled={should}")
            return should
    
    # 默认检测（如烟雾等其他类别）
    # print(f"[DEBUG] Defaulting to True for class_id={cls_id}")
    return True

# 全局变量用于存储各摄像头的煤量数据
camera_coal_quantities = {}

def predict_realtime(model_path, rtsp_url, img_size, output_dir, output_filename, class_ids, conf=0.25, 
                    belt_scale=1.0, person_region=None, smoke_threshold=0.5, camera_id=None, hls_server_actual_port=None):
    print(f"[DEBUG] predict_realtime called with hls_server_actual_port: {hls_server_actual_port}")
    model = YOLO(model_path)
    valid_classes = list(range(8))  # 8个类别
    if not all(cid in valid_classes for cid in class_ids):
        raise ValueError(f"Invalid class_ids: {class_ids}. Valid range: {valid_classes}")

    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        raise IOError(f"Cannot open RTSP stream {rtsp_url}")

    # 获取原始视频尺寸
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    
    # 设置目标分辨率
    target_width = 800
    target_height = 450
    
    print(f"[视频处理] 原始分辨率: {original_width}x{original_height}")
    print(f"[视频处理] 目标分辨率: {target_width}x{target_height}")
    
    # 计算缩放比例，用于调整锚框和标注大小
    scale_x = target_width / original_width if original_width > 0 else 1.0
    scale_y = target_height / original_height if original_height > 0 else 1.0
    scale_factor = min(scale_x, scale_y)  # 使用较小的缩放比例确保一致性
    
    print(f"[视频处理] 缩放比例: X={scale_x:.3f}, Y={scale_y:.3f}, 统一比例={scale_factor:.3f}")
    
    # 启动ffmpeg进程，使用目标分辨率
    ffmpeg_process, hls_url = start_ffmpeg(output_dir, output_filename, target_width, target_height, fps, camera_id, hls_server_actual_port)
    
    # 如果提供了摄像头ID，则更新数据库中的HLS流地址
    if camera_id is not None:
        update_camera_hls_url(camera_id, hls_url)
        print(f"[HLS流] 已为摄像头{camera_id}创建HLS流: {hls_url}")
    
    drawer = Drawer()
    
    belt_detected = False
    avg_H, avg_W = 0, 0

    # 获取大块比例阈值
    large_block_ratio = config_manager.large_block_ratio
    print(f"[参数] 大块比例阈值: {large_block_ratio}")

    # 添加更多日志输出
    print(f"[预测] 开始实时预测 摄像头ID: {camera_id}, 大块比例阈值: {large_block_ratio}")
    print(f"[预测] 输出视频分辨率: {target_width}x{target_height}, 帧率: {fps}")
    
    # 检测计数器
    detection_counter = {cls: 0 for cls in range(8)}
    frame_counter = 0
    
    # 创建工作类别ID集合（根据检测配置动态更新）
    working_class_ids = class_ids.copy()
    
    # 初始化当前摄像头的煤量变量
    current_coal_quantity = 0.0

    try:
        while not exit_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print("No more frames to read.")
                break
            
            # 缩放帧到目标分辨率
            frame = cv2.resize(frame, (target_width, target_height))
            
            frame_counter += 1
            if frame_counter % 100 == 0:
                print(f"[预测] 已处理 {frame_counter} 帧")
                # 每100帧打印当前的检测配置，便于监控
                # print(f"[预测] 当前检测配置 (cached): {detection_config}") # 打印缓存的配置
                
                # 尝试打印从Modbus直接获取的配置（如果连接）
                if 'modbus_client' in globals() and modbus_client and modbus_client.connected: # (修正: is_connected -> connected)
                    try:
                        current_modbus_config = {}
                        if hasattr(modbus_client, 'is_detection_enabled'):
                            current_modbus_config["大块检测"] = modbus_client.is_detection_enabled(DETECT_LARGE_CHUNK)
                            current_modbus_config["异物检测"] = modbus_client.is_detection_enabled(DETECT_FOREIGN_OBJECT)
                            current_modbus_config["人员越界检测"] = modbus_client.is_detection_enabled(DETECT_PERSONNEL)
                            current_modbus_config["跑偏检测"] = modbus_client.is_detection_enabled(DETECT_DEVIATION)
                            print(f"[预测] 当前Modbus检测配置 (live): {current_modbus_config}")
                        else:
                            print("[预测] ModbusClient.is_detection_enabled 方法不存在，无法获取实时Modbus配置。")
                    except Exception as e:
                        print(f"[预测] 获取实时Modbus配置失败: {e}")
                else:
                    print(f"[预测] 当前检测配置 (cached): {detection_config}")


            # 根据当前的检测配置，更新工作类别ID集合
            working_class_ids = [cid for cid in class_ids if should_detect_class(cid)]
            
            if frame_counter % 100 == 0:
                # 打印当前启用的类别
                enabled_classes = [CLASS_NAMES.get(cid, f"类别{cid}") for cid in working_class_ids]
                print(f"[预测] 当前启用的检测类别: {enabled_classes}")
            
            # 如果没有启用任何类别，则只检测皮带和煤量
            if not working_class_ids:
                working_class_ids = [0, 1]  # 皮带和煤量
            
            # 执行检测（只检测当前启用的类别）
            results = model.predict(source=frame, imgsz=img_size, conf=conf, classes=working_class_ids, save=False)
            
            # 记录当前帧检测到的所有类别
            detected_classes_set = set()
            
            area_pulley, area_coal = 0, 0
            H, W = 0, 0

            # 皮带尺寸检测和煤量计算
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    detected_classes_set.add(cls)
                    
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    area = (x2 - x1) * (y2 - y1)

                    if cls == 0:  # 皮带
                        H, W = y2 - y1, x2 - x1
                        belt_detected = True
                        avg_H = 0.2 * H + 0.8 * avg_H
                        avg_W = 0.2 * W + 0.8 * avg_W
                        area_pulley += area
                    elif cls == 1:  # 煤量
                        area_coal += area

            # 计算煤量比例并存储到全局字典
            if area_pulley > 0:
                coal_ratio = float(area_coal / area_pulley) * 100  # 转换为百分比
                # 平滑煤量变化，防止数值跳动
                if current_coal_quantity == 0:
                    current_coal_quantity = coal_ratio
                else:
                    current_coal_quantity = 0.8 * current_coal_quantity + 0.2 * coal_ratio
                
                # 确保煤量值在0-100之间
                current_coal_quantity = max(0, min(100, current_coal_quantity))
                
                # 更新全局字典
                if camera_id is not None:
                    camera_coal_quantities[camera_id] = current_coal_quantity
                    if frame_counter % 100 == 0:
                        print(f"[煤量] 摄像头{camera_id}当前煤量: {current_coal_quantity:.1f}%")
            
            coal_ratio_str = f"{current_coal_quantity:.1f}%" if area_pulley else "N/A"

            # 动态阈值计算（基于缩放后的分辨率）
            if belt_detected and avg_H > 0 and avg_W > 0:
                belt_area = avg_H * avg_W
                large_threshold = belt_area * 0.3 * belt_scale
                width_threshold = avg_W * 0.3
            else:
                large_threshold = 1000
                width_threshold = 30

            # 处理检测结果
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    confidence = float(box.conf[0])
                    label = CLASS_NAMES.get(cls, "未知")

                    # 更新检测计数
                    detection_counter[cls] += 1
                    
                    # 如果检测到300次，打印一下检测计数
                    total_detections = sum(detection_counter.values())
                    if total_detections % 300 == 0:
                        print(f"[检测统计] 总计: {total_detections} 次检测")
                        for c, count in detection_counter.items():
                            if count > 0:
                                print(f"  - {CLASS_NAMES.get(c, f'类别{c}')}: {count} 次")

                    # 绘制检测框时传入缩放因子
                    frame = drawer.draw(frame, box, label, 
                                      coal_ratio_str if cls == 1 else None, 
                                      scale_factor=scale_factor)
                    
                    # 根据检测类别判断是否需要上报事件
                    alarm_rule_id = AlarmTypeMapper.get_alarm_rule_id(cls, detected_classes_set)
                    
                    # 上报事件逻辑 - 不再对煤量(cls==1)进行上报
                    if alarm_rule_id and cls != 1:  # 忽略煤量的报警上报
                        alarm_name = AlarmTypeMapper.get_alarm_name(alarm_rule_id)
                        
                        # 根据不同类别的特殊处理逻辑
                        should_report = False
                        
                        if cls == 2:  # 大块检测
                            # 检查当前是否启用大块检测
                            if detection_config["大块检测"]:
                                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                                block_width = x2 - x1
                                block_area = (x2 - x1) * (y2 - y1)
                                
                                # 使用缩放后的图像宽度进行比例计算
                                should_report = AlarmTypeMapper.should_report_large_block(
                                    block_width=block_width,
                                    image_width=target_width,  # 使用目标宽度而非原始宽度
                                    threshold_ratio=large_block_ratio
                                )
                                
                                # 打印大块检测信息
                                actual_ratio = block_width / target_width
                                print(f"[大块检测] 大块宽度: {block_width}, 目标图像宽度: {target_width}, 实际比例: {actual_ratio:.4f}, 阈值: {large_block_ratio}, 是否上报: {should_report}")
                        
                        elif cls == 6 and person_region:  # 人员检测
                            # 检查当前是否启用人员越界检测
                            if detection_config["人员越界检测"]:
                                xc = (box.xyxy[0][0] + box.xyxy[0][2]) / 2
                                yc = (box.xyxy[0][1] + box.xyxy[0][3]) / 2
                                should_report = (person_region[0] <= xc <= person_region[2] and 
                                                person_region[1] <= yc <= person_region[3])
                            
                        elif cls == 7:  # 烟雾检测
                            should_report = confidence >= smoke_threshold
                            
                        elif cls == 5:  # 异物报警
                            # 检查当前是否启用异物检测
                            should_report = detection_config["异物检测"]
                            
                        elif cls in [3, 4]:  # 跑偏报警
                            # 检查当前是否启用跑偏检测
                            if detection_config["跑偏检测"]:
                                should_report = not (3 in detected_classes_set and 4 in detected_classes_set)
                        
                        # 上报事件，确保传递所有必要参数
                        if should_report:
                            try:
                                print(f"[检测事件] 类别: {cls}, 报警类型: {alarm_name}, 报警规则ID: {alarm_rule_id}, 置信度: {confidence:.4f}")
                                
                                # 通过 Modbus 发送报警信号
                                if 'modbus_client' in globals():
                                    modbus_client.send_alarm(alarm_name, confidence, True)
                                
                                # 通过 HTTP 上报事件
                                if event_reporter:
                                    event_reporter.report_alarm_event(
                                        camera_id=config_manager.camera_id,
                                        alarm_type=alarm_name,
                                        confidence=confidence,
                                        frame=frame,
                                        alarm_rule_id=alarm_rule_id
                                    )
                            except Exception as e:
                                print(f"[错误] 上报事件或发送Modbus信号失败: {str(e)}")
                                import traceback
                                traceback.print_exc()

            # 显示人员检测区域（如果设置了人员区域，需要根据缩放比例调整）
            if person_region:
                # 使用已计算的缩放比例调整人员检测区域坐标
                scaled_person_region = [
                    int(person_region[0] * scale_x),
                    int(person_region[1] * scale_y),
                    int(person_region[2] * scale_x),
                    int(person_region[3] * scale_y)
                ]
                
                # 根据缩放因子调整人员检测区域边框粗细
                region_thickness = max(1, int(2 * scale_factor))
                cv2.rectangle(frame, 
                            (scaled_person_region[0], scaled_person_region[1]),
                            (scaled_person_region[2], scaled_person_region[3]), 
                            (42, 42, 165), region_thickness)
            
            try:
                if ffmpeg_process.stdin:
                    ffmpeg_process.stdin.write(frame.tobytes())
                    ffmpeg_process.stdin.flush() # 确保数据被发送
            except BrokenPipeError:
                print("[错误] FFmpeg进程的管道已损坏。可能已提前退出。停止发送帧。")
                exit_event.set() # 设置退出事件，以便主循环可以终止
                break 
            except Exception as e:
                print(f"[错误] 写入帧到FFmpeg时发生未知错误: {e}")
                exit_event.set()
                break


    except KeyboardInterrupt:
        print("Interrupted by user.")
    finally:
        # 打印最终检测统计
        print("\n[检测最终统计]")
        print(f"总计处理帧数: {frame_counter}")
        print(f"总计检测次数: {sum(detection_counter.values())}")
        for cls, count in detection_counter.items():
            if count > 0:
                print(f"  - {CLASS_NAMES.get(cls, f'类别{cls}')}: {count} 次")
                
        cap.release()
        ffmpeg_process.stdin.close()
        ffmpeg_process.wait()
        
        # 清除所有 Modbus 报警信号
        if 'modbus_client' in globals():
            modbus_client.clear_all_alarms()
        
        print("[视频处理] 视频流处理已停止")

def _create_alarm_event(self, cls, confidence, frame, event_counter, event_queue):
    _, buffer = cv2.imencode('.jpg', frame)
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    event = {
        "eventID": event_counter,
        "alarmTime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "alarmRule": {
            "alarmRuleID": cls,
            "alarmRuleName": CLASS_NAMES[cls]
        },
        "confidence": confidence,
        "resolved": False,
        "cameraID": 5,
        "cameraName": "监控摄像头",
        "cameraLatlng": [32.554590586802384, 117.0123338699341],
        "cameraModel": "海康威视DL2",
        "image_base64": image_base64
    }
    
    if event_queue:
        event_queue.put(event)

def run_flask_server(hls_dir, host='0.0.0.0', port=2022, camera_id=None):
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.route('/hls_output/<path:filename>')
    def serve_hls(filename):
        return send_from_directory(hls_dir, filename)
    
    # 新增API端点提供煤量数据
    @app.route('/api/coal_quantity', methods=['GET'])
    def get_coal_quantity():
        if camera_id is not None:
            coal_quantity = camera_coal_quantities.get(camera_id, 0)
            return jsonify({"coal_quantity": f"{coal_quantity:.1f}"})
        return jsonify({"coal_quantity": "0.0", "error": "Camera ID not specified"}), 400

    if camera_id:
        print(f"[HLS服务器] 已启动，摄像头ID: {camera_id}, 地址: http://{host}:{port}/hls_output/")
        print(f"[煤量接口] 已启动，地址: http://{host}:{port}/api/coal_quantity")
    else:
        print(f"[HLS服务器] 已启动，地址: http://{host}:{port}/hls_output/")
    
    try:
        app.run(host=host, port=port, threaded=True)
    except OSError as e:
        print(f"[错误] 无法在端口 {port} 启动服务器: {e}")
        # 尝试使用备用端口
        fallback_port = port + 1000
        print(f"[尝试] 在备用端口 {fallback_port} 上启动服务器")
        try:
            app.run(host=host, port=fallback_port, threaded=True)
            print(f"[成功] 服务器已在端口 {fallback_port} 上启动")
        except Exception as e2:
            print(f"[严重错误] 无法启动服务器: {e2}")

def signal_handler(sig, frame):
    print(f"[信号处理] 接收到信号 {sig}，正在设置退出事件...")
    exit_event.set()
    # 不在此处调用 sys.exit()，让主程序优雅退出

def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler) # 处理终止信号
    
    # 声明全局变量，确保在使用前声明
    global modbus_client
    global event_reporter
    
    # 使用配置管理器解析参数
    args = config_manager.parse_args()
    
    # 检查必要参数
    if not args.source:
        print("Error: --source parameter is required")
        sys.exit(1)
    
    # 初始化 Modbus 客户端（使用配置文件中的参数）
    try:
        from modbus_config import (
            MODBUS_HOST, MODBUS_PORT, MODBUS_UNIT, 
            INITIAL_DETECTION_CONFIG, ALARM_ENABLE_INITIAL_VALUE
        )
        
        # 打印Modbus初始配置
        print(f"[Modbus] 初始配置:")
        print(f"  - 主机: {MODBUS_HOST}:{MODBUS_PORT}")
        print(f"  - 单元: {MODBUS_UNIT}")
        print(f"  - 初始报警使能值: 0x{ALARM_ENABLE_INITIAL_VALUE:02X}")
        print(f"  - 初始检测配置: {INITIAL_DETECTION_CONFIG}")
        
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
            print(f"[Modbus] 已成功连接到PLC: {MODBUS_HOST}:{MODBUS_PORT}")
            
            # 启动Modbus报警使能监控线程
            modbus_monitor_thread = threading.Thread(
                target=monitor_alarm_enable_register,
                args=(modbus_client,),
                daemon=True
            )
            modbus_monitor_thread.start()
            print("[Modbus] 报警使能监控线程已启动")
        else:
            print(f"[Modbus警告] 无法连接到PLC: {MODBUS_HOST}:{MODBUS_PORT}, 将在运行时自动重试")
            print(f"[Modbus] 使用初始配置: {INITIAL_DETECTION_CONFIG}")
    except ImportError:
        print("[Modbus警告] 未找到modbus_config.py，使用默认的Modbus配置")
        modbus_client = ModbusClient()  # 使用默认配置
    except Exception as e:
        print(f"[Modbus错误] 初始化Modbus客户端失败: {str(e)}")
        import traceback
        traceback.print_exc()
        # 我们仍然创建客户端实例，但使用默认值
        modbus_client = ModbusClient()
    
    if not args.cameraid:
        print("警告: 未提供摄像头ID (--cameraid)，事件上报功能将被禁用")
    else:
        # 初始化事件上报器
        event_reporter = EventReporter(base_url=config_manager.base_url)
        
        # 设置事件冷却时间（如果指定）
        if hasattr(args, 'cooldown') and args.cooldown is not None:
            event_reporter.set_cooldown_period(args.cooldown)
            print(f"[配置] 设置事件冷却时间为 {args.cooldown} 分钟")
    
    # 解析类别ID
    class_ids = [int(cid) for cid in args.class_id.split(',')] if args.class_id.strip() else list(range(8))
    
    # 检查ffmpeg是否安装
    import shutil
    if not shutil.which('ffmpeg'):
        print("FFmpeg is not installed or not found in PATH.")
        sys.exit(1)

    # 启动每个摄像头对应端口的 Flask 服务器
    if args.cameraid:
        hls_actual_port = 2000 + int(args.cameraid)
        flask_thread = threading.Thread(
            target=run_flask_server,
            args=(args.hls_dir, '0.0.0.0', hls_actual_port, args.cameraid),
            daemon=True
        )
        flask_thread.start()
        print(f"[煤量接口] 为摄像头 {args.cameraid} 启动接口，端口: {hls_actual_port}")
    else:
        hls_actual_port = 2022 # 默认HLS端口
        flask_thread = threading.Thread(
            target=run_flask_server,
            args=(args.hls_dir, '0.0.0.0', hls_actual_port, None),
            daemon=True
        )
        flask_thread.start()
    
    print(f"[DEBUG] main: HLS actual port determined as: {hls_actual_port}")

    try:
        # 开始实时预测
        predict_realtime(
            args.model, 
            args.source, 
            args.img_size, 
            args.hls_dir, 
            args.hls_filename, 
            class_ids, 
            args.conf,
            camera_id=args.cameraid,
            hls_server_actual_port=hls_actual_port # 传递实际的HLS端口
        )
    finally:
        # 关闭 Modbus 连接
        if 'modbus_client' in globals():
            modbus_client.disconnect()

if __name__ == '__main__':
    main()