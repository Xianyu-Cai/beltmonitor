import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';
import * as waitOn from 'wait-on';

let mainWindow: BrowserWindow | null = null;

// 启动前端和后端服务
function startServices() {
  // 启动后端服务
  exec('npm run start:backend', (err, stdout, stderr) => {
    if (err) {
      console.error(`Error starting backend: ${err}`);
      return;
    }
    console.log(`Backend started: ${stdout}`);
  });

  // 等待后端服务启动
  waitOn({
    resources: ['http://localhost'], // 假设后端服务运行在 3000 端口
    timeout: 30000, // 等待 30 秒
  }, (err) => {
    if (err) {
      console.error('Backend service did not start in time:', err);
      return;
    }

    // 启动前端服务
    exec('npm run start:frontend', (err, stdout, stderr) => {
      if (err) {
        console.error(`Error starting frontend: ${err}`);
        return;
      }
      console.log(`Frontend started: ${stdout}`);
    });
  });
}

// 创建 Electron 窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // 允许在渲染进程中使用 Node.js
    },
  });

  // 加载前端应用（通常是 localhost:3000）
  mainWindow.loadURL('http://localhost:3000');
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 启动前后端服务
  startServices();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
