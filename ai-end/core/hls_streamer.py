"""
HLS streaming module for managing HLS streams and FFmpeg processes.
"""

import os
import subprocess
import threading
import logging
import requests
import mysql.connector

logger = logging.getLogger(__name__)


class HLSStreamer:
    """HLS流媒体管理器，负责FFmpeg进程和HLS流的创建与管理"""
    
    def __init__(self, output_dir='hls_output'):
        """
        初始化HLS流媒体管理器
        
        Args:
            output_dir (str): HLS输出目录
        """
        self.output_dir = output_dir
        self.lock = threading.Lock()
        self.ffmpeg_process = None
        self.hls_url = None
        self.is_running = False
        
        # 确保输出目录存在
        os.makedirs(self.output_dir, exist_ok=True)
    
    def start_ffmpeg(self, output_filename, width, height, fps, camera_id=None, hls_server_port=2022):
        """
        启动FFmpeg进程，将视频流转换为HLS格式
        
        Args:
            output_filename (str): 输出文件名
            width (int): 视频宽度
            height (int): 视频高度
            fps (float): 帧率
            camera_id (int, optional): 摄像头ID
            hls_server_port (int): HLS服务器端口
            
        Returns:
            tuple: (ffmpeg_process, hls_url)
        """
        with self.lock:
            try:
                # 如果提供了摄像头ID，则为该摄像头创建单独的目录
                if camera_id is not None:
                    camera_output_dir = os.path.join(self.output_dir, f"camera_{camera_id}")
                    os.makedirs(camera_output_dir, exist_ok=True)
                    output_path = os.path.join(camera_output_dir, output_filename)
                else:
                    output_path = os.path.join(self.output_dir, output_filename)
                
                # FFmpeg命令
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
                
                self.ffmpeg_process = subprocess.Popen(command, stdin=subprocess.PIPE)
                
                # 构建HLS URL
                if camera_id:
                    self.hls_url = f"http://localhost:{hls_server_port}/hls_output/camera_{camera_id}/{output_filename}"
                else:
                    self.hls_url = f"http://localhost:{hls_server_port}/hls_output/{output_filename}"
                
                self.is_running = True
                logger.info(f"FFmpeg进程已启动，HLS URL: {self.hls_url}")
                
                return self.ffmpeg_process, self.hls_url
                
            except Exception as e:
                logger.error(f"启动FFmpeg进程失败: {e}")
                self.is_running = False
                return None, None
    
    def write_frame(self, frame):
        """
        向FFmpeg进程写入帧数据
        
        Args:
            frame: 图像帧数据
            
        Returns:
            bool: 是否成功写入
        """
        if not self.is_running or not self.ffmpeg_process or not self.ffmpeg_process.stdin:
            return False
        
        try:
            self.ffmpeg_process.stdin.write(frame.tobytes())
            self.ffmpeg_process.stdin.flush()
            return True
        except BrokenPipeError:
            logger.error("FFmpeg进程的管道已损坏")
            self.is_running = False
            return False
        except Exception as e:
            logger.error(f"写入帧到FFmpeg时发生错误: {e}")
            self.is_running = False
            return False
    
    def stop(self):
        """停止FFmpeg进程"""
        with self.lock:
            if self.ffmpeg_process:
                try:
                    if self.ffmpeg_process.stdin:
                        self.ffmpeg_process.stdin.close()
                    self.ffmpeg_process.wait()
                    logger.info("FFmpeg进程已停止")
                except Exception as e:
                    logger.error(f"停止FFmpeg进程时发生错误: {e}")
                finally:
                    self.ffmpeg_process = None
                    self.is_running = False
    
    def update_camera_hls_url(self, camera_id, hls_url):
        """
        更新摄像头HLS流地址到数据库
        
        Args:
            camera_id (int): 摄像头ID
            hls_url (str): HLS流地址
        """
        # 数据库更新
        connection = None
        try:
            connection = mysql.connector.connect(
                host="localhost",
                user="root",
                password="123456",
                database="beltmonitor",
                auth_plugin='mysql_native_password'
            )
            
            cursor = connection.cursor()
            
            update_query = """
                UPDATE camera
                SET hlsUrl = %s
                WHERE id = %s
            """
            
            cursor.execute(update_query, (hls_url, camera_id))
            connection.commit()
            
            logger.info(f"数据库HLS URL已更新，摄像头ID={camera_id}")
            
        except mysql.connector.Error as err:
            logger.error(f"数据库更新HLS URL失败: {err}")
        finally:
            if connection:
                cursor.close()
                connection.close()
        
        # API更新（备用方案）
        try:
            api_url = f"http://localhost:8080/api/admin/updateCamera"
            data = {
                "id": camera_id,
                "hlsUrl": hls_url
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(api_url, json=data, headers=headers)
            
            if response.status_code in [200, 201]:
                logger.info(f"API HLS URL已更新，摄像头ID={camera_id}")
            else:
                logger.warning(f"API更新HLS URL失败，状态码：{response.status_code}")
                
        except Exception as e:
            logger.error(f"API更新HLS URL时出错：{e}")
    
    def get_status(self):
        """
        获取流媒体状态
        
        Returns:
            dict: 状态信息
        """
        with self.lock:
            return {
                'is_running': self.is_running,
                'hls_url': self.hls_url,
                'ffmpeg_pid': self.ffmpeg_process.pid if self.ffmpeg_process else None,
                'output_dir': self.output_dir
            }
    
    def __enter__(self):
        """上下文管理器入口"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.stop()