# AI端模块化架构

这是重构后的AI端代码，采用模块化设计以提高可维护性和可扩展性。

## 架构概览

### 核心模块 (`core/`)

- **`video_processor.py`** - 视频捕获和帧处理
  - 支持RTSP流接入
  - 自动缩放到目标分辨率
  - 线程安全的帧读取

- **`yolo_detector.py`** - YOLO模型推理和检测
  - 模型加载和推理
  - 检测配置动态更新
  - 检测统计追踪

- **`hls_streamer.py`** - HLS流媒体管理
  - FFmpeg进程管理
  - HLS流生成和分发
  - 数据库URL更新

- **`alarm_processor.py`** - 报警逻辑处理
  - 多种报警类型支持
  - 事件上报和Modbus通信
  - 可配置的报警策略

- **`coal_quantity_tracker.py`** - 煤量计算和追踪
  - 实时煤量计算
  - 多摄像头数据管理
  - 平滑算法处理

- **`detection_engine.py`** - 检测引擎编排
  - 整体流水线管理
  - 生命周期控制
  - 状态监控

### 工具模块 (`utils/`)

- **`drawing.py`** - 绘制工具
  - 检测框绘制
  - 标签和文本渲染
  - 人员检测区域显示

## 使用方法

### 基本启动
```bash
python detect-cap-1.py --source rtsp://camera_url --cameraid 1
```

### 完整参数示例
```bash
python detect-cap-1.py \
  --model ./best.pt \
  --source rtsp://192.168.1.100:554/stream \
  --cameraid 1 \
  --img_size 800,450 \
  --conf 0.25 \
  --class_id "0,1,2,3,4,5,6,7" \
  --base_url http://localhost:8080 \
  --cooldown 30
```

## 参数说明

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `--model` | YOLO模型文件路径 | `./best.pt` |
| `--source` | 视频源(RTSP URL) | 必需 |
| `--cameraid` | 摄像头ID | 可选 |
| `--img_size` | 输入图像尺寸 | `[800,450]` |
| `--conf` | 置信度阈值 | `0.25` |
| `--class_id` | 检测类别ID | 全部类别 |
| `--base_url` | API基础URL | `http://localhost:8080` |
| `--cooldown` | 报警冷却时间(分钟) | `30` |

## API接口

### 煤量查询
```
GET http://localhost:2XXX/api/coal_quantity
```
其中2XXX = 2000 + 摄像头ID

### HLS流访问
```
http://localhost:2XXX/hls_output/camera_X/output.m3u8
```

## 配置文件

### Modbus配置 (`modbus_config.py`)
```python
MODBUS_HOST = "169.254.43.168"
MODBUS_PORT = 502
MODBUS_UNIT = 1
```

### 数据库配置
在各模块中硬编码，建议未来提取到配置文件：
- 主机: localhost
- 用户: root  
- 密码: 123456
- 数据库: beltmonitor

## 检测类别

| ID | 名称 | 报警类型 |
|----|------|----------|
| 0 | 皮带 | 无报警 |
| 1 | 煤量 | 煤量报警 |
| 2 | 大块 | 大块报警 |
| 3 | 左轴 | 跑偏报警 |
| 4 | 右轴 | 跑偏报警 |
| 5 | 异物 | 异物报警 |
| 6 | 人员 | 人员越界报警 |
| 7 | 烟雾 | 烟雾报警 |

## 依赖要求

- Python 3.7+
- ultralytics (YOLO)
- opencv-python
- Flask
- Flask-CORS
- mysql-connector-python
- requests
- PIL (Pillow)
- numpy
- pymodbus

## 故障排除

### 常见问题

1. **模块导入失败**
   - 确保所有依赖包已安装
   - 检查Python路径设置

2. **RTSP连接失败**
   - 检查网络连接
   - 验证RTSP URL格式
   - 确认摄像头权限

3. **Modbus连接失败**
   - 检查IP地址和端口
   - 确认PLC设备状态
   - 验证网络连通性

4. **HLS流无法播放**
   - 检查FFmpeg是否安装
   - 确认端口未被占用
   - 验证输出目录权限

### 日志查看
程序会输出详细的日志信息，包括：
- 模块初始化状态
- 检测统计信息
- 错误和异常信息
- 性能指标

## 开发说明

### 添加新功能模块
1. 在`core/`目录创建新模块
2. 实现必要的接口方法
3. 在`detection_engine.py`中集成
4. 更新`__init__.py`导出

### 修改检测逻辑
主要修改`yolo_detector.py`和`alarm_processor.py`

### 扩展报警类型
修改`alarm_type_mapper.py`和相关处理逻辑

## 维护建议

1. **定期检查日志** - 监控系统运行状态
2. **更新模型文件** - 根据需要更新YOLO模型
3. **备份配置** - 定期备份重要配置文件
4. **性能监控** - 关注内存和CPU使用情况
5. **依赖更新** - 定期更新Python包依赖