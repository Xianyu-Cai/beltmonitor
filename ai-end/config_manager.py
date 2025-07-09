# config_manager.py
import argparse
import requests
import json
import os
import mysql.connector

class ConfigManager:
    def __init__(self):
        self.camera_id = None
        self.source = None
        self.base_url = "http://localhost:8080"  # 默认API基础URL
        self.large_block_ratio = 0.3  # 默认大块比例为0.3
    
    def parse_args(self):
        """解析命令行参数并设置全局配置"""
        parser = argparse.ArgumentParser(description="YOLO Real-Time Detection with Alarm Reporting")
        parser.add_argument('--model', type=str, default='./best.pt', help="Path to the YOLO model (.pt file)")
        parser.add_argument('--source', type=str, help="Video source (e.g., RTSP URL)")
        parser.add_argument('--img_size', type=int, default=[800,450], help="Input image size (default: 640)")
        parser.add_argument('--hls_dir', type=str, default='hls_output', help="Directory to save HLS files (default: hls_output)")
        parser.add_argument('--hls_filename', type=str, default='output.m3u8', help="HLS playlist filename (default: output.m3u8)")
        parser.add_argument('--class_id', type=str, default='', help="Class IDs to detect, e.g., '0,1' or leave empty for all classes")
        parser.add_argument('--conf', type=float, default=0.25, help="Confidence threshold (default: 0.25)")
        parser.add_argument('--cameraid', type=int, help="Camera ID for event reporting")
        parser.add_argument('--base_url', type=str, default="http://localhost:8080", help="Base URL for API endpoints")
        parser.add_argument('--cooldown', type=int, default=30, help="Event reporting cooldown period in minutes (default: 30)")
        
        args = parser.parse_args()
        self.camera_id = args.cameraid
        self.base_url = args.base_url
        
        # 获取大块比例配置
        if self.camera_id:
            self.get_ai_config()
        
        if not args.source and self.camera_id is not None:
            # 如果没提供source但有cameraid，尝试获取摄像头的rtsp地址
            rtsp_url = self.get_camera_rtsp_url()
            if rtsp_url:
                args.source = rtsp_url
                print(f"[配置] 从API获取摄像头RTSP地址: {rtsp_url}")
            else:
                print("[配置] 无法获取摄像头RTSP地址，请手动提供--source参数")
                exit(1)
        
        return args
    
    def get_camera_rtsp_url(self):
        """根据摄像头ID获取RTSP URL"""
        try:
            print(f"[配置] 正在获取摄像头ID {self.camera_id} 的RTSP地址...")
            response = requests.get(f"{self.base_url}/api/user/getBeltState")
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    camera_list = data.get('data', {}).get('cameraList', [])
                    for camera in camera_list:
                        if camera.get('cameraID') == self.camera_id:
                            rtsp_url = camera.get('rtspUrl')
                            print(f"[配置] 成功获取摄像头 {camera.get('cameraName')} 的RTSP地址")
                            return rtsp_url
                    print(f"[配置] 未找到ID为 {self.camera_id} 的摄像头")
                else:
                    print(f"[配置] 获取摄像头列表失败: {data.get('message')}")
            else:
                print(f"[配置] API请求失败: {response.status_code}")
        except Exception as e:
            print(f"[配置] 获取摄像头RTSP地址时发生错误: {e}")
        return None
    
    def get_ai_config(self):
        """从数据库获取AI配置，包括大块比例阈值"""
        try:
            connection = mysql.connector.connect(
                host="localhost",
                user="root",
                password="123456",
                database="beltmonitor",
                auth_plugin='mysql_native_password'
            )
            
            cursor = connection.cursor()
            
            # 首先检查ai_config表是否有large_block_ratio字段
            try:
                check_column_query = """
                    SELECT COUNT(*) 
                    FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'beltmonitor' 
                    AND TABLE_NAME = 'ai_config' 
                    AND COLUMN_NAME = 'large_block_ratio'
                """
                cursor.execute(check_column_query)
                column_exists = cursor.fetchone()[0] > 0
                
                # 如果字段不存在，添加该字段
                if not column_exists:
                    print("[配置] ai_config表中不存在large_block_ratio字段，正在添加...")
                    alter_table_query = """
                        ALTER TABLE ai_config
                        ADD COLUMN large_block_ratio FLOAT DEFAULT 0.3
                    """
                    cursor.execute(alter_table_query)
                    connection.commit()
                    print("[配置] 已成功添加large_block_ratio字段")
            except Exception as e:
                print(f"[配置警告] 检查或添加large_block_ratio字段时出错: {e}")
            
            # 查询与摄像头ID关联的AI配置
            query = """
                SELECT large_block_ratio, belt_scale, smoke_threshold
                FROM ai_config 
                WHERE cameraId = %s 
                LIMIT 1
            """
            
            cursor.execute(query, (self.camera_id,))
            result = cursor.fetchone()
            
            if result:
                # 获取large_block_ratio字段（如果存在）
                if len(result) >= 1 and result[0] is not None:
                    ratio = float(result[0])
                    if 0 <= ratio <= 1:
                        self.large_block_ratio = ratio
                        print(f"[配置] 从数据库获取大块比例配置: {ratio}")
                    else:
                        print(f"[配置] 数据库中的大块比例值 {ratio} 不在有效范围内(0-1)，使用默认值 {self.large_block_ratio}")
                
                # 获取其他配置参数（如需要）
                if len(result) >= 2 and result[1] is not None:
                    self.belt_scale = float(result[1])
                    print(f"[配置] 从数据库获取皮带比例: {self.belt_scale}")
                
                if len(result) >= 3 and result[2] is not None:
                    self.smoke_threshold = float(result[2])
                    print(f"[配置] 从数据库获取烟雾阈值: {self.smoke_threshold}")
            else:
                print(f"[配置] 未找到摄像头ID为 {self.camera_id} 的AI配置，使用默认值")
                
                # 如果该摄像头没有配置记录，创建一条新记录
                try:
                    insert_query = """
                        INSERT INTO ai_config (cameraId, large_block_ratio, belt_scale, smoke_threshold) 
                        VALUES (%s, %s, 1.0, 0.5)
                    """
                    cursor.execute(insert_query, (self.camera_id, self.large_block_ratio))
                    connection.commit()
                    print(f"[配置] 已为摄像头 {self.camera_id} 创建AI配置记录，大块比例为 {self.large_block_ratio}")
                except Exception as e:
                    print(f"[配置] 创建AI配置记录失败: {e}")
            
        except mysql.connector.Error as err:
            print(f"[数据库错误] 获取AI配置失败: {err}")
        except Exception as e:
            print(f"[配置] 获取AI配置时发生错误: {e}")
        finally:
            if 'connection' in locals() and connection.is_connected():
                cursor.close()
                connection.close()

# 全局配置管理器实例
config_manager = ConfigManager()