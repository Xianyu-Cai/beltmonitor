# 智能皮带监控系统 (Intelligent Belt Conveyor Monitoring System)

## 🎯 项目概述

本项目是一个基于深度学习的工业皮带传送带实时监控系统，集成了YOLO目标检测、WebSocket实时通信、HLS视频流、Modbus PLC通信等先进技术，实现对皮带运输过程中的异常情况进行智能识别与报警。

### 核心功能
- ✅ **实时目标检测**: 检测皮带、煤量、大块异物、人员越界、跑偏等异常
- ✅ **HLS视频流**: 25fps高帧率视频流，支持多摄像头并发
- ✅ **WebSocket实时通信**: 前端实时接收检测框数据
- ✅ **Modbus PLC集成**: 与工业PLC无缝对接，实现报警信号输出
- ✅ **事件上报**: HTTP协议上报报警事件到后端服务器
- ✅ **煤量计算**: 基于面积比例实时计算煤量百分比
- ✅ **可配置检测**: 支持动态开关各类检测功能

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       智能皮带监控系统                              │
├─────────────────────────────────────────────────────────────────┤
│  前端展示层 (Frontend)                                          │
│  ├── Web界面: Vue.js/React (端口: 8080)                          │
│  ├── 视频播放: HLS.js播放器                                     │
│  └── 实时数据: WebSocket客户端                                   │
├─────────────────────────────────────────────────────────────────┤
│  业务逻辑层 (Backend)                                            │
│  ├── Flask HLS服务器: (摄像头id +2000)                           │  
│  ├── WebSocket服务器: 8001端口                                   │
│  ├── 事件上报器: HTTP API                                        │
│  └── Modbus客户端: PLC通信                                       │
├─────────────────────────────────────────────────────────────────┤
│  AI推理层 (AI Engine)                                           │
│  ├── YOLOv8模型: 8类目标检测                                     │
│  ├── 检测频率: 1fps (标准性能模式)                               │
│  └── 锚框延时: 1秒持久化显示                                     │
├─────────────────────────────────────────────────────────────────┤
│  数据存储层 (Data Layer)                                        │
│  ├── MySQL数据库: 摄像头配置                                     │
│  ├── 图片存储: 报警图片持久化                                    │
│  └── 日志记录: 运行状态监控                                      │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 技术栈

### 核心依赖
| 技术 | 版本 | 用途 |
|---|---|---|
| Python | 3.8+ | 主开发语言 |
| OpenCV | 4.8+ | 视频处理与图像操作 |
| PyTorch | 2.0+ | 深度学习框架 |
| Ultralytics YOLO | 8.0+ | 目标检测模型 |
| Flask | 2.3+ | Web服务器 |
| websockets | 11.0+ | WebSocket通信 |
| pymodbus | 3.0+ | Modbus通信 |
| mysql-connector | 8.0+ | 数据库连接 |

### 系统要求
- **操作系统**: Windows 10/11 或 Ubuntu 20.04+
- **GPU**: NVIDIA GTX 1060+ (推荐RTX 3060+)
- **内存**: 8GB RAM (推荐16GB+)
- **存储**: 50GB+ 可用空间
- **网络**: 千兆以太网 (RTSP流稳定性)

## 🚀 快速开始

### 环境准备

1. **克隆项目**
```bash
git clone [项目地址]
cd beltmonitor
```

2. **安装依赖**
```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 安装Python包
pip install -r ai-end/requirements.txt

# 检查FFmpeg
ffmpeg -version
```

3. **配置环境**
```bash
# 复制配置文件模板
cp ai-end/config_template.py ai-end/config.py

# 编辑配置项
# - RTSP流地址
# - 数据库连接
# - Modbus参数
# - 检测阈值等
```

4. **启动系统**
```bash
# 启动主检测程序
cd ai-end
python detect-cap-1.py --model best.pt --source rtsp://admin:password@ip:554/stream --cameraid 1

# 启动WebSocket服务器 (可选)
python ws_server.py
```

### 访问系统
- **Web界面**: http://localhost:8080
- **HLS流**: http://localhost:2022/hls_output/camera_1/output.m3u8
- **WebSocket**: ws://localhost:8001/ws/boxes/1
- **煤量API**: http://localhost:2022/api/coal_quantity

## 🔧 配置文件详解

### config.py (主要配置)
```python
# 摄像头配置
CAMERA_ID = 1
RTSP_URL = "rtsp://admin:password@192.168.1.100:554/h264"

# 检测参数
DETECTION_INTERVAL = 1.0  # 秒 (标准性能模式 ~1fps)
CONFIDENCE_THRESHOLD = 0.25
IMAGE_SIZE = [800, 450]

# 报警阈值
LARGE_BLOCK_RATIO = 0.15  # 大块宽度占比
PERSON_REGION = [100, 100, 700, 350]  # 人员检测区域
SMOKE_THRESHOLD = 0.5

# 网络配置
HLS_PORT = 2022
WEBSOCKET_PORT = 8001
MODBUS_HOST = "192.168.1.50"
MODBUS_PORT = 502
```

### 检测类别映射
| 类别ID | 名称 | 颜色 | 检测开关 |
|---|---|---|---|
| 0 | 皮带 | 绿色(0,255,0) | 始终开启 |
| 1 | 煤量 | 蓝色(0,0,255) | 始终开启 |
| 2 | 大块 | 红色(255,0,0) | 可配置 |
| 3 | 左轴 | 青色(0,255,255) | 跑偏检测 |
| 4 | 右轴 | 黄色(255,255,0) | 跑偏检测 |
| 5 | 异物 | 紫色(255,0,255) | 可配置 |
| 6 | 人员 | 橙色(255,165,0) | 可配置 |
| 7 | 烟雾 | 灰色(128,128,128) | 可配置 |

## 📊 性能指标

### 系统性能
- **检测延迟**: < 200ms (GPU)
- **视频延迟**: < 2s (HLS)
- **WebSocket延迟**: < 100ms
- **CPU占用**: 30-50% (i7-12700)
- **GPU占用**: 60-80% (RTX 3060)
- **内存占用**: 2-4GB

### 检测精度
- **大块检测**: 95%+ 准确率
- **异物检测**: 92%+ 准确率  
- **人员检测**: 98%+ 准确率
- **跑偏检测**: 90%+ 准确率
- **煤量计算**: ±5% 误差范围

## 🔍 API接口文档

### HLS流接口
```
GET /hls_output/camera_{id}/output.m3u8
GET /hls_output/camera_{id}/output{n}.ts
```

### WebSocket接口
```
连接地址: ws://localhost:8001/ws/boxes/{camera_id}
消息格式: {"boxes": [...], "classes": [...], "timestamp": 1234567890}
```

### HTTP API
```
# 获取煤量数据
GET /api/coal_quantity
返回: {"coal_quantity": "75.5"}

# 上报报警事件
POST /api/user/addAlarmEvent
参数: {"cameraId": 1, "alarmType": "大块", "confidence": 0.85}
```

### Modbus寄存器
| 地址 | 功能 | 数据类型 |
|---|---|---|
| 40001 | 报警使能 | uint16 |
| 40002 | 大块报警 | bool |
| 40003 | 异物报警 | bool |
| 40004 | 人员报警 | bool |
| 40005 | 跑偏报警 | bool |
| 40006 | 煤量数值 | float |

## 🛠️ 开发指南

### 项目结构
```
beltmonitor/
├── ai-end/                    # AI后端
│   ├── detect-cap-1.py       # 主检测程序
│   ├── ws_server.py          # WebSocket服务器
│   ├── event_reporter.py     # 事件上报
│   ├── modbus_client.py      # PLC通信
│   ├── config_manager.py     # 配置管理
│   ├── alarm_type_mapper.py  # 报警映射
│   ├── ws_producer.py        # WebSocket生产者
│   ├── ws_models.py          # 数据模型
│   ├── requirements.txt      # Python依赖
│   └── hls_output/          # HLS文件输出
├── frontend-new/            # 前端Vue项目
├── docs/                    # 文档
├── logs/                    # 日志文件
└── README.md               # 项目说明
```

### 开发环境
```bash
# 开发模式启动
python detect-cap-1.py --debug --log-level DEBUG

# 性能分析
python -m cProfile detect-cap-1.py

# 内存监控
python -m memory_profiler detect-cap-1.py
```

## 🚨 故障排查

### 常见问题

**Q1: RTSP连接失败**
- 检查网络连通性: `ping 摄像头IP`
- 验证RTSP地址: `ffplay rtsp://...`
- 检查用户名密码

**Q2: 检测框不显示**
- 检查模型文件路径
- 验证检测类别配置
- 查看日志输出

**Q3: WebSocket连接失败**
- 检查端口占用: `netstat -ano | findstr 8001`
- 验证防火墙设置
- 查看WebSocket日志

**Q4: 性能问题**
- 检查GPU使用率: `nvidia-smi`
- 降低检测频率
- 减少检测类别

### 日志查看
```bash
# 实时查看日志
tail -f logs/app.log

# 按级别过滤
grep ERROR logs/app.log
grep WARNING logs/app.log
```

## 📈 监控与维护

### 健康检查脚本
```bash
#!/bin/bash
# health_check.sh

echo "=== 系统健康检查 ==="
echo "1. 进程状态:"
ps aux | grep detect-cap-1.py

echo "2. 端口监听:"
netstat -tuln | grep -E "(2022|8001|8080)"

echo "3. GPU状态:"
nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits

echo "4. 内存使用:"
free -h

echo "5. 磁盘空间:"
df -h
```

### 自动重启脚本
```bash
#!/bin/bash
# restart_service.sh

# 停止旧进程
pkill -f detect-cap-1.py
sleep 2

# 启动新进程
cd ai-end
nohup python detect-cap-1.py --model best.pt --source rtsp://... --cameraid 1 > logs/app.log 2>&1 &
```

## 🤝 贡献指南

### 开发规范
1. **代码风格**: 遵循PEP8规范
2. **提交信息**: 使用Conventional Commits
3. **分支管理**: Git Flow工作流
4. **测试覆盖**: 核心功能单元测试覆盖率>80%

### 提交模板
```
type(scope): subject

body

footer
```

### 代码审查清单
- [ ] 功能测试通过
- [ ] 性能指标达标
- [ ] 文档更新完整
- [ ] 安全检查通过

