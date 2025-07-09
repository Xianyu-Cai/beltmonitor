# HLS实时播放优化TODO

## 问题描述
1. **延迟问题**: AI处理后的视频通过FFmpeg生成的HLS流(m3u8/ts文件)延迟较大，无法满足实时播放需求
2. **播放重置问题**: 前端刷新后总是从output0.ts开始播放，而不是最新的片段
3. **实时性差**: 当前HLS配置无法保证低延迟的实时推理显示

## 根本原因分析
### 1. FFmpeg HLS配置问题
- `hls_time: 2`秒片段过长，增加延迟
- `hls_list_size: 5`保留过多历史片段
- 缺少低延迟优化参数

### 2. 前端播放器配置问题
- Video.js默认从playlist开头播放
- 没有配置live模式和低延迟参数
- 缺少自动跳转到最新片段的逻辑

### 3. 系统架构问题
- 单向流处理，缺少反馈机制
- HLS协议本身不适合超低延迟场景

## 解决方案

### 方案1: 优化FFmpeg HLS参数 (优先推荐)
```python
# 在detect-cap-1.py的start_ffmpeg函数中优化参数
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
    '-preset', 'ultrafast',      # 更快的编码
    '-tune', 'zerolatency',      # 零延迟调优
    '-pix_fmt', 'yuv420p',
    '-f', 'hls',
    '-hls_time', '0.5',          # 减少到0.5秒片段
    '-hls_list_size', '3',       # 只保留3个片段
    '-hls_flags', 'delete_segments+independent_segments', # 删除旧片段+独立片段
    '-hls_segment_type', 'mpegts',
    '-hls_allow_cache', '0',     # 禁用缓存
    '-g', '15',                  # 减少GOP大小
    '-sc_threshold', '0',        # 禁用场景切换检测
    output_path
]
```

### 方案2: 前端Video.js配置优化
```javascript
// 在Monitor.js中配置低延迟播放
const playerOptions = {
    fluid: true,
    responsive: true,
    html5: {
        hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true
        }
    },
    liveui: true,  // 启用直播UI
    liveTracker: {
        trackingThreshold: 20,
        liveTolerance: 15
    },
    playbackRates: [],  // 禁用倍速播放
    controls: true
};

// 播放器事件处理
player.ready(() => {
    // 自动跳转到直播边缘
    player.liveTracker.seekToLiveEdge();
    
    // 监听播放状态
    player.on('loadedmetadata', () => {
        if (player.liveTracker.isLive()) {
            player.liveTracker.seekToLiveEdge();
        }
    });
});
```

### 方案3: WebSocket + Canvas实时流 (备选方案)
如果HLS仍无法满足实时性要求，考虑：
```python
# 添加WebSocket服务器推送帧数据
@socketio.on('request_frame')
def handle_frame_request(data):
    camera_id = data.get('camera_id')
    if camera_id in active_cameras:
        # 发送最新处理帧的base64数据
        emit('frame_data', {
            'camera_id': camera_id,
            'frame': latest_frames[camera_id],
            'timestamp': time.time()
        })
```

### 方案4: RTMP推流 (高级方案)
```python
# 使用RTMP代替HLS
rtmp_command = [
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
    '-f', 'flv',
    f'rtmp://localhost:1935/live/camera_{camera_id}'
]
```

## 实施优先级

### 第一阶段 (立即实施)
1. 优化FFmpeg HLS参数
2. 前端Video.js配置调优
3. 添加自动跳转到最新片段逻辑

### 第二阶段 (如果延迟仍不满足)
1. 实施WebSocket实时帧推送
2. 前端Canvas渲染优化

### 第三阶段 (长期优化)
1. 考虑RTMP/WebRTC等低延迟协议
2. 边缘计算优化

## 测试验证
- [ ] 测试优化后的HLS延迟时间
- [ ] 验证刷新页面后的播放行为
- [ ] 压力测试多摄像头并发性能
- [ ] 测试网络波动下的稳定性

## 预期效果
- HLS延迟从2-6秒降低到1-2秒
- 刷新页面后自动播放最新内容
- 更好的实时用户体验
