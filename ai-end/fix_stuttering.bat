@echo off
echo ======================================
echo 前端视频卡顿修复工具
echo ======================================
echo.

REM 设置UTF-8编码
chcp 65001 > nul

echo 🔍 开始分析视频卡顿问题...

REM 运行修复脚本
python fix_video_stuttering.py --camera-id 1 --width 640 --height 360 --fps 15

echo.
echo ✅ 修复完成！
echo.
echo 📋 已创建以下优化文件：
echo   - optimized_player_1.html (优化播放器)
echo   - stuttering_fix_report.txt (优化报告)
echo   - 修复后的FFmpeg命令

echo.
echo 🚀 使用方法：
echo 1. 双击打开 optimized_player_1.html
echo 2. 在浏览器中测试视频播放
echo 3. 根据网络状况选择画质
pause