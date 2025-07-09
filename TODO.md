# HLS 实时播放优化任务清单

## 问题描述
当前AI视频流推送存在以下问题：
1. HLS文件生成延迟过大，无法保证实时推理显示
2. 前端刷新后总是从output0.ts开始播放，不符合实时播放要求

## 问题分析

### 1. HLS延迟问题原因
- **分片时间过长**: 当前设置 `-hls_time 2` (2秒分片)，导致最少2秒延迟
- **缓冲策略**: `-hls_list_size 5` 保留5个分片，增加了延迟
- **编码预设**: `-preset veryfast` 可能还不够快
- **帧率处理**: 固定25fps可能不匹配实际处理速度
- **FFmpeg写入机制**: 当前通过stdin逐帧写入效率低

### 2. 播放起始点问题
- 前端播放器默认从播放列表开头开始
- 缺少实时播放的起始点定位机制
- 没有处理直播流的特殊逻辑
- M3U8文件缺少实时流标识

## 解决方案

### 优先级1: 降低HLS延迟
- [ ] **调整FFmpeg参数**
  - 减少分片时间: `-hls_time 0.5`
  - 减少播放列表大小: `-hls_list_size 3`
  - 使用更快编码预设: `-preset ultrafast`
  - 添加低延迟选项: `-tune zerolatency`
  - 添加实时流参数: `-hls_flags live_start_index+delete_segments`

- [ ] **优化编码参数**
  ```bash
  -c:v libx264
  -preset ultrafast
  -tune zerolatency
  -crf 28
  -maxrate 1500k
  -bufsize 3000k
  -g 15  # 更小的GOP大小
  -keyint_min 15
  -sc_threshold 0
  -fflags +flush_packets
  -flush_packets 1
  ```

- [ ] **修改FFmpeg写入机制**
  - 改进 `start_ffmpeg` 函数中的帧写入方式
  - 使用帧缓冲队列避免阻塞
  - 实现异步写入和错误处理

### 优先级2: 解决播放起始点问题
- [ ] **前端播放器优化**
  - 使用hls.js替代原生video（已有hls.min.js）
  - 配置实时播放模式：`liveSyncDurationCount: 3`
  - 启用低延迟模式：`liveMaxLatencyDurationCount: 5`
  - 自动跳转到最新分片：`startPosition: -1`

- [ ] **修改Monitor.js播放器初始化**
  ```javascript
  // 在createCameraPlayer函数中使用hls.js
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: false,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 5,
      startPosition: -1,
      maxBufferLength: 10,
      maxMaxBufferLength: 20,
      liveDurationInfinity: true
    });
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
  }
  ```

- [ ] **M3U8播放列表优化**
  - 在FFmpeg命令中添加: `-hls_playlist_type event`
  - 添加实时流标识: `-hls_flags live_start_index`
  - 设置起始索引: `-hls_start_number_source datetime`

### 优先级3: AI处理流程优化
- [ ] **修改detect-cap-1.py中的视频处理**
  - 在 `predict_realtime` 函数中实现帧缓冲队列
  - 使用多线程分离AI检测和视频输出
  - 动态调整处理帧率匹配AI速度

- [ ] **优化FFmpeg进程管理**
  - 实现FFmpeg进程的健康检查
  - 添加进程重启机制
  - 监控输出文件生成状态

### 优先级4: 替代方案评估
- [ ] **WebSocket + Canvas方案**
  - AI处理后直接通过WebSocket发送JPEG帧
  - 前端Canvas实时显示，延迟可控制在毫秒级
  - 适合对延迟要求极高的场景

- [ ] **WebRTC实现**
  - 评估使用WebRTC进行超低延迟推流
  - 实现AI处理结果的实时传输
  - 前端使用WebRTC播放器

## 具体实现步骤

### 第一阶段: HLS参数优化 (立即执行)
1. **修改 `ai-end/detect-cap-1.py` 中的 `start_ffmpeg` 函数**
   ```python
   command = [
       'ffmpeg',
       '-y',
       '-f', 'rawvideo',
       '-vcodec', 'rawvideo',
       '-pix_fmt', 'bgr24',
       '-s', f'{width}x{height}',
       '-r', str(fps),
       '-i', '-',
       '-c:v', 'libx264',
       '-preset', 'ultrafast',
       '-tune', 'zerolatency',
       '-crf', '28',
       '-maxrate', '1500k',
       '-bufsize', '3000k',
       '-g', '15',
       '-keyint_min', '15',
       '-sc_threshold', '0',
       '-fflags', '+flush_packets',
       '-flush_packets', '1',
       '-f', 'hls',
       '-hls_time', '0.5',
       '-hls_list_size', '3',
       '-hls_flags', 'delete_segments+live_start_index',
       '-hls_playlist_type', 'event',
       '-hls_start_number_source', 'datetime',
       output_path
   ]
   ```

2. **优化帧写入机制**
   - 在 `predict_realtime` 函数中实现帧队列
   - 使用单独线程处理FFmpeg写入
   - 添加帧丢弃机制防止积压

### 第二阶段: 前端播放器改进 (1-2天)
1. **修改 `frontend-new/scripts/Monitor.js`**
   - 创建支持hls.js的播放器函数
   - 配置低延迟参数
   - 实现播放器错误处理和重连

2. **更新HTML页面**
   - 确保引入hls.js库
   - 修改播放器初始化代码

### 第三阶段: 动态帧率控制 (3-5天)
1. **在AI检测循环中添加性能监控**
   ```python
   def predict_realtime(...):
       frame_times = []
       target_fps = fps
       
       while not exit_event.is_set():
           start_time = time.time()
           # ... AI检测代码 ...
           
           process_time = time.time() - start_time
           frame_times.append(process_time)
           
           if len(frame_times) > 30:  # 每30帧调整一次
               avg_time = sum(frame_times[-30:]) / 30
               actual_fps = 1.0 / avg_time
               if actual_fps < target_fps * 0.8:
                   # 动态降低输出帧率
                   pass
   ```

2. **实现帧缓冲队列管理**
3. **添加自适应质量控制**

### 第四阶段: 替代方案实现 (1-2周)
1. **WebSocket + Canvas原型**
2. **性能对比测试**
3. **用户体验评估**

## 测试验证

### 延迟测试
- [ ] 测量端到端延迟（从AI检测到前端显示）
  - 在AI处理时添加时间戳
  - 前端播放器显示延迟指标
- [ ] 对比不同方案的延迟差异
  - HLS优化前后对比
  - WebSocket方案对比
- [ ] 网络条件变化下的稳定性测试

### 功能测试
- [ ] 验证刷新后播放起始点正确性
  - 测试页面刷新后自动播放最新内容
  - 验证直播模式工作正常
- [ ] 测试长时间运行的稳定性
  - 24小时连续运行测试
  - 内存和CPU使用监控
- [ ] 多摄像头并发测试
  - 同时运行多个摄像头流
  - 验证系统资源使用情况

## 相关文件详细说明

### 主要修改文件
- `ai-end/detect-cap-1.py` - FFmpeg参数优化和帧处理改进
  - `start_ffmpeg()` 函数 (行271-330)
  - `predict_realtime()` 函数 (行453-800)
- `frontend-new/scripts/Monitor.js` - 播放器实现改进
  - `createCameraPlayer()` 函数需新增
  - 使用hls.js替代原生播放器
- `frontend-new/pages/monitor.html` - 确保引入hls.js

### 支持文件
- `frontend-new/scripts/hls.min.js` - 已存在，用于HLS播放
- `backend/src/controllers/user/` - 可能需要添加流状态API

## 关键技术要点

### HLS低延迟配置
```bash
# 核心参数说明
-hls_time 0.5              # 0.5秒分片（最关键）
-hls_list_size 3           # 只保留3个分片
-tune zerolatency          # 零延迟调优
-hls_flags live_start_index # 实时流起始索引
```

### 前端播放器配置
```javascript
// hls.js关键配置
liveSyncDurationCount: 3,      // 同步缓冲区大小
liveMaxLatencyDurationCount: 5, // 最大延迟控制
startPosition: -1,             // 从最新位置开始
maxBufferLength: 10            // 最大缓冲长度
```

## 注意事项
- 降低分片时间会增加CPU使用率和网络请求频率
- 需要平衡实时性和视频质量，避免过度优化导致卡顿
- 考虑网络带宽限制，特别是多摄像头并发场景
- 确保方案在不同浏览器上的兼容性
- 监控FFmpeg进程资源使用，避免内存泄漏

## 预期效果
- **延迟控制**: 端到端延迟从当前5-8秒降低到1-3秒
- **播放体验**: 前端刷新后自动播放最新内容，无需从头开始
- **稳定性**: 长时间运行稳定，支持多摄像头并发
- **扩展性**: 为将来WebSocket等超低延迟方案做好技术储备

## 实施优先级建议
1. **立即执行**: FFmpeg参数优化（预计减少50%延迟）
2. **本周内**: 前端播放器改进（解决刷新问题）
3. **下周**: 动态帧率控制（进一步优化性能）
4. **后续**: 替代方案评估（为未来升级准备）