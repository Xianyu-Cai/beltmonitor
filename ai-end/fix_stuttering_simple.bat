@echo off
echo ======================================
echo 视频卡顿修复工具
echo ======================================
echo.

echo 🔧 正在修复视频卡顿问题...

echo. > optimized_player.html
echo ^<!DOCTYPE html^> >> optimized_player.html
echo ^<html^> >> optimized_player.html
echo ^<head^> >> optimized_player.html
echo ^<title^>优化视频播放器^</title^> >> optimized_player.html
echo ^<meta charset="UTF-8"^> >> optimized_player.html
echo ^<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"^>^</script^> >> optimized_player.html
echo ^<style^>body{margin:0;background:#000;color:#fff}.video-container{max-width:800px;margin:0 auto}#video{width:100%;height:auto;background:#000}.controls{position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.8);padding:10px;border-radius:5px;font-family:monospace;font-size:12px}^</style^> >> optimized_player.html
echo ^</head^> >> optimized_player.html
echo ^<body^> >> optimized_player.html
echo ^<div class="video-container"^> >> optimized_player.html
echo ^<video id="video" controls autoplay muted playsinline^>^</video^> >> optimized_player.html
echo ^<div class="controls"^>延迟: ^<span id="latency"^>-^</span^>ms ^| 缓冲: ^<span id="buffer"^>-^</span^>s^</div^> >> optimized_player.html
echo ^</div^> >> optimized_player.html
echo ^<script^> >> optimized_player.html
echo var video=document.getElementById('video'),videoSrc='http://localhost:2001/hls_output/camera_1/output.m3u8',hls; >> optimized_player.html
echo var config={lowLatencyMode:true,maxBufferLength:2,maxMaxBufferLength:4,liveSyncDurationCount:1,liveMaxLatencyDurationCount:2}; >> optimized_player.html
echo if(Hls.isSupported()){hls=new Hls(config);hls.loadSource(videoSrc);hls.attachMedia(video);hls.on(Hls.Events.MANIFEST_PARSED,function(){video.play();});}else{video.src=videoSrc;video.play();} >> optimized_player.html
echo setInterval(function(){if(video.buffered.length>0){document.getElementById('buffer').textContent=(video.buffered.end(0)-video.currentTime).toFixed(1);}},1000); >> optimized_player.html
echo ^</script^> >> optimized_player.html
echo ^</body^> >> optimized_player.html
echo ^</html^> >> optimized_player.html

echo ✅ 修复完成！
echo.
echo 📋 已创建文件：
echo   - optimized_player.html (优化播放器)
echo   - 可直接双击打开使用
echo.
echo 🎯 使用方法：
echo 1. 双击打开 optimized_player.html
echo 2. 浏览器会自动播放视频
pause