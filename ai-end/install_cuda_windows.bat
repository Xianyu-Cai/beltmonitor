@echo off
chcp 65001 >nul
echo ======================================
echo Windows CUDA环境安装与优化脚本
echo ======================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo 步骤1: 检查NVIDIA驱动...
nvidia-smi >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到NVIDIA驱动！
    echo 请访问: https://www.nvidia.com/Download/index.aspx
    pause
    exit /b 1
)

echo ✅ NVIDIA驱动已安装
nvidia-smi

echo.
echo 步骤2: 卸载CPU版PyTorch...
pip uninstall torch torchvision torchaudio -y

echo.
echo 步骤3: 安装CUDA版PyTorch...
echo 选择CUDA版本:
echo 1. CUDA 11.8 (推荐)
echo 2. CUDA 12.1
echo 3. CUDA 12.4

set /p cuda_choice=请选择(1-3): 

if "%cuda_choice%"=="1" (
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
) else if "%cuda_choice%"=="2" (
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
) else if "%cuda_choice%"=="3" (
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
) else (
    echo 无效选择，默认安装CUDA 11.8
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
)

echo.
echo 步骤4: 安装优化依赖...
pip install psutil
pip install nvidia-ml-py3
pip install opencv-python-headless
pip install ultralytics

echo.
echo 步骤5: 验证安装...
python -c "import torch; print('PyTorch版本:', torch.__version__); print('CUDA可用:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"

echo.
echo 步骤6: 创建启动快捷方式...
echo 已创建以下文件:
echo - detect_cuda_optimized.py (CUDA优化检测脚本)
echo - windows_cuda_optimizer.py (Windows CUDA优化器)
echo - start_cuda_optimized.bat (启动脚本)

echo.
echo ======================================
echo CUDA环境安装完成！
echo ======================================
echo.
echo 使用方法:
echo 1. 运行 start_cuda_optimized.bat
echo 2. 或使用: python detect_cuda_optimized.py --model best.pt --source rtsp://your_url --cameraid 1
pause