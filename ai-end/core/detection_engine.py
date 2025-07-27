"""
Detection engine module that orchestrates the entire detection pipeline.
"""

import threading
import time
import logging
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .video_processor import VideoProcessor
from .yolo_detector import YOLODetector
from .hls_streamer import HLSStreamer
from .alarm_processor import AlarmProcessor
from .coal_quantity_tracker import CoalQuantityTracker
from utils.drawing import Drawer, CLASS_NAMES

logger = logging.getLogger(__name__)


class DetectionEngine:
    """检测引擎，负责协调整个检测流水线"""
    
    def __init__(self, config_manager, event_reporter=None, modbus_client=None):
        """
        初始化检测引擎
        
        Args:
            config_manager: 配置管理器
            event_reporter: 事件上报器（可选）
            modbus_client: Modbus客户端（可选）
        """
        self.config_manager = config_manager
        self.event_reporter = event_reporter
        self.modbus_client = modbus_client
        
        # 初始化各个组件
        self.video_processor = None
        self.yolo_detector = None
        self.hls_streamer = None
        self.alarm_processor = None
        self.coal_tracker = None
        self.drawer = Drawer()
        
        # 运行状态控制
        self.exit_event = threading.Event()
        self.is_running = False
        
        # 统计信息
        self.frame_counter = 0
        self.stats_update_interval = 100  # 每100帧输出一次统计
        
    def initialize(self, args):
        """
        根据参数初始化所有组件
        
        Args:
            args: 命令行参数对象
            
        Returns:
            bool: 初始化是否成功
        """
        try:
            # 初始化视频处理器
            self.video_processor = VideoProcessor(
                rtsp_url=args.source,
                target_width=args.img_size[0] if isinstance(args.img_size, list) else 800,
                target_height=args.img_size[1] if isinstance(args.img_size, list) else 450
            )
            
            # 初始化YOLO检测器
            self.yolo_detector = YOLODetector(
                model_path=args.model,
                img_size=args.img_size,
                conf_threshold=args.conf
            )
            
            # 初始化HLS流媒体管理器
            self.hls_streamer = HLSStreamer(output_dir=args.hls_dir)
            
            # 初始化报警处理器
            self.alarm_processor = AlarmProcessor(
                event_reporter=self.event_reporter,
                modbus_client=self.modbus_client,
                config_manager=self.config_manager
            )
            
            # 初始化煤量追踪器
            self.coal_tracker = CoalQuantityTracker()
            
            logger.info("检测引擎初始化完成")
            return True
            
        except Exception as e:
            logger.error(f"检测引擎初始化失败: {e}")
            return False
    
    def start_detection(self, args, class_ids, hls_server_port):
        """
        开始检测流水线
        
        Args:
            args: 命令行参数
            class_ids (list): 要检测的类别ID列表
            hls_server_port (int): HLS服务器端口
        """
        if self.is_running:
            logger.warning("检测引擎已经在运行中")
            return
        
        try:
            # 打开视频流
            if not self.video_processor.open():
                logger.error("无法打开视频流")
                return
            
            # 获取视频属性
            video_props = self.video_processor.get_properties()
            logger.info(f"视频属性: {video_props}")
            
            # 启动HLS流
            ffmpeg_process, hls_url = self.hls_streamer.start_ffmpeg(
                output_filename=args.hls_filename,
                width=video_props['target_width'],
                height=video_props['target_height'],
                fps=video_props['fps'],
                camera_id=args.cameraid,
                hls_server_port=hls_server_port
            )
            
            if not ffmpeg_process:
                logger.error("无法启动HLS流")
                return
            
            # 更新数据库中的HLS URL
            if args.cameraid is not None:
                self.hls_streamer.update_camera_hls_url(args.cameraid, hls_url)
            
            self.is_running = True
            self.frame_counter = 0
            
            logger.info(f"检测流水线已启动，HLS URL: {hls_url}")
            
            # 主检测循环
            self._detection_loop(args, class_ids, video_props)
            
        except Exception as e:
            logger.error(f"检测过程中发生异常: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self._cleanup()
    
    def _detection_loop(self, args, class_ids, video_props):
        """
        主检测循环
        
        Args:
            args: 命令行参数
            class_ids (list): 类别ID列表
            video_props (dict): 视频属性
        """
        logger.info("开始主检测循环")
        
        while not self.exit_event.is_set():
            # 读取帧
            ret, frame = self.video_processor.read_frame()
            if not ret:
                logger.warning("无法读取帧，可能视频流结束")
                break
            
            self.frame_counter += 1
            
            # 定期输出统计信息
            if self.frame_counter % self.stats_update_interval == 0:
                self._log_statistics()
            
            # YOLO检测
            results = self.yolo_detector.predict(frame, class_ids, self.modbus_client)
            if not results:
                continue
            
            # 处理煤量计算
            area_pulley, area_coal, coal_ratio_str = self.coal_tracker.process_detections(
                results, args.cameraid
            )
            
            # 收集当前帧检测到的所有类别
            detected_classes_set = set()
            for result in results:
                if result.boxes is not None:
                    for box in result.boxes:
                        cls = int(box.cls[0])
                        detected_classes_set.add(cls)
            
            # 绘制检测结果
            frame = self._draw_detections(frame, results, coal_ratio_str, video_props)
            
            # 绘制人员检测区域（如果有）
            if hasattr(args, 'person_region') and args.person_region:
                frame = self.drawer.draw_person_region(
                    frame, args.person_region,
                    video_props['scale_x'], video_props['scale_y'], video_props['scale_factor']
                )
            
            # 处理报警
            self.alarm_processor.process_detection_results(
                results=results,
                frame=frame,
                detected_classes_set=detected_classes_set,
                person_region=getattr(args, 'person_region', None),
                smoke_threshold=getattr(args, 'smoke_threshold', 0.5),
                large_block_ratio=self.config_manager.large_block_ratio,
                target_width=video_props['target_width']
            )
            
            # 写入HLS流
            if not self.hls_streamer.write_frame(frame):
                logger.error("写入HLS流失败，退出检测循环")
                self.exit_event.set()
                break
    
    def _draw_detections(self, frame, results, coal_ratio_str, video_props):
        """
        绘制检测结果
        
        Args:
            frame: 图像帧
            results: 检测结果
            coal_ratio_str (str): 煤量比例字符串
            video_props (dict): 视频属性
            
        Returns:
            绘制后的图像帧
        """
        for result in results:
            if result.boxes is None:
                continue
                
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                label = CLASS_NAMES.get(cls, "未知")
                
                # 绘制检测框
                frame = self.drawer.draw(
                    frame, box, label,
                    coal_ratio_str if cls == 1 else None,
                    scale_factor=video_props['scale_factor']
                )
        
        return frame
    
    def _log_statistics(self):
        """输出统计信息"""
        logger.info(f"已处理 {self.frame_counter} 帧")
        
        # 获取检测统计
        detection_stats = self.yolo_detector.get_detection_stats()
        logger.info(f"当前检测配置: {detection_stats['detection_config']}")
        
        # 输出煤量信息
        if self.config_manager.camera_id:
            coal_quantity = self.coal_tracker.get_coal_quantity(self.config_manager.camera_id)
            logger.info(f"摄像头{self.config_manager.camera_id}当前煤量: {coal_quantity:.1f}%")
    
    def stop(self):
        """停止检测引擎"""
        logger.info("正在停止检测引擎...")
        self.exit_event.set()
        self.is_running = False
    
    def _cleanup(self):
        """清理资源"""
        logger.info("开始清理资源...")
        
        # 清理组件
        if self.video_processor:
            self.video_processor.close()
        
        if self.hls_streamer:
            self.hls_streamer.stop()
        
        if self.alarm_processor:
            self.alarm_processor.clear_all_alarms()
        
        # 输出最终统计
        if self.yolo_detector:
            final_stats = self.yolo_detector.get_detection_stats()
            logger.info(f"最终检测统计: 总计处理帧数: {self.frame_counter}")
            logger.info(f"总计检测次数: {final_stats['total_detections']}")
            for cls, count in final_stats['class_counts'].items():
                if count > 0:
                    logger.info(f"  - {CLASS_NAMES.get(cls, f'类别{cls}')}: {count} 次")
        
        logger.info("资源清理完成")
    
    def get_status(self):
        """
        获取检测引擎状态
        
        Returns:
            dict: 状态信息
        """
        status = {
            'is_running': self.is_running,
            'frame_counter': self.frame_counter,
            'video_processor': self.video_processor.get_properties() if self.video_processor else None,
            'hls_streamer': self.hls_streamer.get_status() if self.hls_streamer else None,
            'detection_stats': self.yolo_detector.get_detection_stats() if self.yolo_detector else None,
            'coal_quantities': self.coal_tracker.get_all_coal_quantities() if self.coal_tracker else None
        }
        return status
    
    def update_detection_config(self, config):
        """
        更新检测配置
        
        Args:
            config (dict): 检测配置
        """
        if self.yolo_detector:
            self.yolo_detector.update_detection_config(config)
        if self.alarm_processor:
            self.alarm_processor.update_detection_config(config)
        logger.info(f"检测引擎配置已更新: {config}")


def create_flask_server(coal_tracker, hls_dir, camera_id=None):
    """
    创建Flask服务器用于提供HLS流和煤量API
    
    Args:
        coal_tracker: 煤量追踪器实例
        hls_dir (str): HLS输出目录
        camera_id (int, optional): 摄像头ID
        
    Returns:
        Flask app实例
    """
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.route('/hls_output/<path:filename>')
    def serve_hls(filename):
        return send_from_directory(hls_dir, filename)
    
    @app.route('/api/coal_quantity', methods=['GET'])
    def get_coal_quantity():
        if camera_id is not None:
            coal_quantity = coal_tracker.get_coal_quantity(camera_id)
            return jsonify({"coal_quantity": f"{coal_quantity:.1f}"})
        return jsonify({"coal_quantity": "0.0", "error": "Camera ID not specified"}), 400

    return app