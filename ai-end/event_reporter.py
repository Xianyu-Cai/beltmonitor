import requests
import json
import os
import time
import cv2
import shutil
from config_manager import config_manager
from datetime import datetime, timedelta

class EventReporter:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.event_counter = 0
        # 添加报警冷却时间记录
        self.last_alarm_time = {}  # 格式: {alarm_type: last_report_time}
        self.cooldown_period = 30 * 60  # 30分钟冷却时间（单位：秒）
        # 添加冷却提示计数器
        self.cooldown_message_counter = {}  # 格式: {alarm_type: counter}
        self.cooldown_message_frequency = 20  # 每20次检测到冷却状态才提示一次
        
        # 记录成功和失败的事件数量
        self.success_count = 0
        self.failure_count = 0
        
        # 创建图片存储目录
        self.image_dir = os.path.join("..", "frontend-new", "assets", "images", "alarm")
        print(f"[初始化] 图片保存目录: {os.path.abspath(self.image_dir)}")
        
        try:
            os.makedirs(self.image_dir, exist_ok=True)
            print(f"[初始化] 图片目录已确保存在")
        except Exception as e:
            print(f"[初始化错误] 无法创建图片目录: {str(e)}")
            # 尝试使用绝对路径作为备选方案
            self.image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend-new", "assets", "images", "alarm"))
            print(f"[初始化] 尝试使用绝对路径: {self.image_dir}")
            os.makedirs(self.image_dir, exist_ok=True)
        
        print(f"[初始化完成] 事件上报器已准备就绪，基础URL: {self.base_url}")
        
    def set_cooldown_period(self, minutes):
        """设置报警冷却时间（分钟）"""
        self.cooldown_period = minutes * 60
        print(f"[事件上报] 设置报警冷却时间为: {minutes} 分钟")
    
    # 报警规则名称与ID的映射表
    ALARM_RULE_ID_MAP = {
        "人员越位报警": 1,
        "异物报警": 2,
        "大块报警": 3,
        "煤量报警": 4,
        "跑偏报警": 5,
        "烟雾报警": 6
    }
        
    def report_alarm_event(self, camera_id, alarm_type, confidence, frame, alarm_rule_id):
        """
        向服务器上报报警事件
        
        Args:
            camera_id (int): 摄像头ID
            alarm_type (str): 报警类型
            confidence (float): 置信度
            frame: 报警时的图像帧
            alarm_rule_id (int): 报警规则ID，这是必需的参数
        
        Returns:
            int: 事件ID，如果因为冷却期而未上报则返回None
        """
        if alarm_rule_id is None:
            print(f"[事件上报错误] 未提供报警规则ID")
            return None
            
        current_time = time.time()
        
        # 检查是否在冷却期内
        if alarm_type in self.last_alarm_time:
            time_since_last_alarm = current_time - self.last_alarm_time[alarm_type]
            if time_since_last_alarm < self.cooldown_period:
                # 增加冷却消息计数器
                if alarm_type not in self.cooldown_message_counter:
                    self.cooldown_message_counter[alarm_type] = 0
                
                self.cooldown_message_counter[alarm_type] += 1
                
                # 仅在特定频率下显示冷却消息
                if self.cooldown_message_counter[alarm_type] % self.cooldown_message_frequency == 0:
                    remaining = self.cooldown_period - time_since_last_alarm
                    print(f"[事件冷却] {alarm_type} 在冷却期内 (剩余 {int(remaining/60)} 分钟 {int(remaining%60)} 秒)，已抑制 {self.cooldown_message_counter[alarm_type]} 次上报")
                
                return None
            else:
                # 重置冷却消息计数器
                self.cooldown_message_counter[alarm_type] = 0
        
        # 不再提前保存临时图片，而是保存帧的副本以便稍后使用
        # 注意：这里只是保存在内存中的帧数据，不写入文件系统
        frame_copy = frame.copy()
                
        # 生成相对路径用于上报
        self.event_counter += 1
        temp_event_id = self.event_counter
        
        # 图片路径采用相对于后端的路径
        future_pic_path = os.path.join("frontend-new", "assets", "images", "alarm", f"alarm{temp_event_id}.jpg")
        
        payload = {
            "id": camera_id,  # 修改从cameraId为id，匹配数据库列名
            "alarmRuleId": alarm_rule_id,  # 使用小写id，与后端接口匹配
            "alarmType": alarm_type,
            "confidence": confidence,
            "picFilePath": future_pic_path  # 相对于后端的预设图片路径
        }
        
        print(f"[事件上报] 摄像头ID: {camera_id}, 报警类型: {alarm_type}, 置信度: {confidence:.4f}, 报警规则ID: {alarm_rule_id}")
        
        try:
            # 发送请求
            print(f"[事件上报] 正在发送请求到: {self.base_url}/api/user/addAlarmEvent")
            response = requests.post(
                f"{self.base_url}/api/user/addAlarmEvent", 
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"[事件上报] 服务器响应状态码: {response.status_code}")
            
            # 处理响应 
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    
                    if data.get("success"):
                        # 更新最后报警时间
                        self.last_alarm_time[alarm_type] = current_time
                        
                        # 获取服务器返回的事件ID - 修正嵌套数据结构的解析
                        event_id = data.get("data", {}).get("data", {}).get("eventID")
                        print(f"[事件上报成功] 事件ID: {event_id}")
                        
                        # 增加成功计数
                        self.success_count += 1
                        
                        if event_id:
                            # 此时才创建实际的图片文件，使用事件ID作为文件名
                            final_pic_path = os.path.join(self.image_dir, f"alarm{event_id}.jpg")
                            
                            # 直接写入最终图片文件
                            try:
                                # 确保图片目录存在
                                os.makedirs(os.path.dirname(final_pic_path), exist_ok=True)
                                
                                # 写入图片
                                success = cv2.imwrite(final_pic_path, frame_copy)
                                if success:
                                    print(f"[事件上报] 图片已保存: {final_pic_path}")
                                else:
                                    print(f"[事件上报错误] 保存图片失败: {final_pic_path}")
                                    # 尝试使用不同格式
                                    png_pic_path = os.path.join(self.image_dir, f"alarm{event_id}.png")
                                    success = cv2.imwrite(png_pic_path, frame_copy)
                                    if success:
                                        print(f"[事件上报] PNG格式图片已保存: {png_pic_path}")
                            except Exception as e:
                                print(f"[事件上报错误] 保存图片时发生异常: {str(e)}")
                                import traceback
                                traceback.print_exc()
                                
                            # 打印下一次可上报时间
                            next_report_time = datetime.fromtimestamp(current_time + self.cooldown_period)
                            print(f"[事件冷却] {alarm_type} 下次可上报时间: {next_report_time.strftime('%Y-%m-%d %H:%M:%S')}")
                            
                            # 打印统计信息
                            print(f"[事件统计] 成功: {self.success_count}, 失败: {self.failure_count}, 总计: {self.success_count + self.failure_count}")
                            
                            return event_id
                        else:
                            print(f"[事件上报警告] 服务器未返回事件ID，不保存图片")
                    else:
                        # 增加失败计数
                        self.failure_count += 1
                        print(f"[事件上报失败] 服务器返回success=false, 错误信息: {data.get('message')}")
                except json.JSONDecodeError:
                    # 增加失败计数
                    self.failure_count += 1
                    print(f"[事件上报错误] 无法解析服务器响应: {response.text}")
            else:
                # 增加失败计数
                self.failure_count += 1
                print(f"[事件上报失败] HTTP状态码: {response.status_code}, 响应: {response.text}")
                
        except Exception as e:
            # 增加失败计数
            self.failure_count += 1
            print(f"[事件上报异常] {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 打印统计信息
        if self.failure_count > 0:
            print(f"[事件统计] 成功: {self.success_count}, 失败: {self.failure_count}, 总计: {self.success_count + self.failure_count}")
        
        return None