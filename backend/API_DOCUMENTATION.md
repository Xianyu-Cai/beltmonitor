# 传送带监控系统 - 后端API文档

## 系统概述
基于NestJS框架构建，提供RESTful API接口，支持传送带实时监控、告警管理、用户权限控制等功能。

## 技术栈
- **框架**: NestJS 9.x
- **数据库**: MySQL 8.x + TypeORM
- **认证**: JWT Token
- **实时通信**: Socket.io
- **文件上传**: Multer

## 基础信息
- **Base URL**: `http://localhost:8080`
- **认证方式**: Bearer Token (部分接口需要)
- **请求格式**: JSON
- **响应格式**: JSON

## 通用响应格式
```typescript
interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}
```

## 接口文档

### 1. 认证相关接口

#### 1.1 用户登录
```
POST /api/user/login
```
**请求参数:**
```typescript
{
  username: string;  // 用户名
  password: string;  // 密码
}
```

**响应数据:**
```typescript
{
  success: boolean;
  userInfo: {
    username: string;
    role: 'admin' | 'user';
    nickname: string;
    tel: string;
    email: string;
    avatarURL: string;
  }
}
```

**示例:**
```bash
curl -X POST http://localhost:8080/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

### 2. 用户相关接口

#### 2.1 获取用户信息
```
GET /api/user/getUserInfo
```
**请求参数:** Query参数 (自动从token获取)

**响应数据:**
```typescript
{
  username: string;
  nickname: string;
  email: string;
  tel: string;
  role: string;
  avatarURL: string;
}
```

#### 2.2 更新用户信息
```
POST /api/user/updateUserInfo
```
**请求参数:**
```typescript
{
  username: string;
  nickname: string;
  email: string;
  tel: string;
  avatarURL: string; // base64图片数据
}
```

#### 2.3 修改密码
```
POST /api/user/updatePassword
```
**请求参数:**
```typescript
{
  oldPassword: string;
  newPassword: string;
}
```

### 3. 监控相关接口

#### 3.1 获取传送带状态概览
```
GET /api/user/getBeltState
```
**响应数据:**
```typescript
{
  cameraTotal: number;     // 摄像头总数
  cameraOnline: number;    // 在线摄像头数
  cameraAlarm: number;     // 告警摄像头数
  alarmEventPending: number; // 待处理告警数
  cameraList: Array<{
    cameraName: string;
    cameraID: number;
    cameraStatus: 'online' | 'offline' | 'alarm';
    cameraModel: string;
    rtspUrl: string;
    alarmRules: Array<{
      alarmRuleID: number;
      alarmRuleName: string;
    }>;
    latlng: [number, number];
  }>
}
```

#### 3.2 获取监控列表
```
GET /api/user/getMonitList
```
**响应数据:**
```typescript
Array<{
  cameraID: number;
  cameraName: string;
  cameraStatus: string;
  hlsUrl: string;
}>
```

#### 3.3 获取摄像头详细信息
```
GET /api/user/getCameraInfo
```
**请求参数:**
```typescript
{
  cameraID: number;
}
```

**响应数据:**
```typescript
{
  cameraName: string;
  cameraID: number;
  cameraStatus: string;
  hlsUrl: string;
  latlng: [number, number];
  cameraModel: string;
  alarmRules: Array<{
    alarmRuleID: number;
    alarmRuleName: string;
  }>;
  alarmEvents: Array<{
    eventID: number;
    alarmTime: string;
    alarmRule: {
      alarmRuleID: number;
      alarmRuleName: string;
    };
    resolved: boolean;
  }>;
}
```

### 4. 告警相关接口

#### 4.1 获取告警事件列表
```
GET /api/user/getAlarmEvents
```
**请求参数:**
```typescript
{
  current: number;     // 当前页码
  pageSize: number;    // 每页条数
  resolved?: 'true' | 'false' | undefined; // 是否已解决
  cameraID?: number;   // 摄像头ID
  alarmType?: string;  // 告警类型
  cameraName?: string; // 摄像头名称
}
```

**响应数据:**
```typescript
{
  list: Array<{
    eventID: number;
    alarmTime: string;
    alarmRule: {
      alarmRuleID: number;
      alarmRuleName: string;
    };
    resolved: boolean;
    cameraID: number;
    cameraName: string;
    cameraLatlng: [number, number];
    cameraModel: string;
    alarmPicUrl: string;
  }>;
  total: number;
}
```

#### 4.2 解决告警事件
```
POST /api/user/resolveAlarm
```
**请求参数:**
```typescript
{
  eventID: number;
}
```

#### 4.3 新增告警事件（AI端调用）
```
POST /api/user/addAlarmEvent
```
**请求参数:**
```typescript
{
  cameraID: number;
  alarmType: string;
  picFilePath: string;
  confidence: number;
  alarmRuleId?: number;
}
```

### 5. 地图配置接口

#### 5.1 获取地图配置
```
GET /api/user/getMapConfig
```
**响应数据:**
```typescript
{
  layer: {
    type: 'imageOverlay' | 'tileLayer';
    url: string;
    bounds?: [[number, number], [number, number]];
  };
  mapOptions: {
    center: [number, number];
    zoom: number;
    minZoom: number;
    maxZoom: number;
    attributionControl: boolean;
    zoomControl: boolean;
  };
}
```

### 6. AI配置接口

#### 6.1 获取AI配置（管理员）
```
GET /api/admin/aiconfig
```
**响应数据:**
```typescript
{
  belt_scale: number;
  person_region: [number, number, number, number];
  original_region: string;
  smoke_threshold: number;
}
```

#### 6.2 更新AI配置（管理员）
```
POST /api/admin/aiconfig
```
**请求参数:**
```typescript
{
  belt_scale: number;
  person_region: [number, number, number, number];
  original_region: string;
  smoke_threshold: number;
}
```

### 7. 摄像头管理接口（管理员）

#### 7.1 获取摄像头列表
```
GET /api/admin/getCameraList
```

#### 7.2 添加摄像头
```
POST /api/admin/addCamera
```
**请求参数:**
```typescript
{
  cameraName: string;
  cameraModel: string;
  latlng: [number, number];
  rtspUrl: string;
  hlsUrl: string;
  alarmRuleIDs: number[];
}
```

#### 7.3 更新摄像头
```
POST /api/admin/updateCamera
```
**请求参数:**
```typescript
{
  cameraID: number;
  cameraName?: string;
  cameraModel?: string;
  latlng?: [number, number];
  rtspUrl?: string;
  hlsUrl?: string;
  alarmRuleIDs?: number[];
}
```

#### 7.4 删除摄像头
```
POST /api/admin/deleteCamera
```
**请求参数:**
```typescript
{
  cameraID: number;
}
```

### 8. 告警规则管理接口（管理员）

#### 8.1 获取告警规则列表
```
GET /api/admin/getAlarmRuleList
```

#### 8.2 添加告警规则
```
POST /api/admin/addAlarmRule
```
**请求参数:**
```typescript
{
  alarmRuleName: string;
  enabled: boolean;
  algorithmType: string;
  relatedCameraIds: number[];
  triggerCondition: {
    time: {
      dayOfWeek: string[];
      timeRange: [string, string];
    };
    count: {
      min: number;
      max: number;
    };
  };
}
```

#### 8.3 更新告警规则
```
POST /api/admin/updateAlarmRule
```

#### 8.4 删除告警规则
```
POST /api/admin/deleteAlarmRule
```

### 9. 用户管理接口（管理员）

#### 9.1 获取用户列表
```
GET /api/admin/getUserList
```

#### 9.2 添加用户
```
POST /api/admin/addUser
```
**请求参数:**
```typescript
{
  username: string;
  password: string;
  role: 'admin' | 'user';
  nickname: string;
  email?: string;
  tel?: string;
}
```

#### 9.3 更新用户
```
POST /api/admin/updateUser
```

#### 9.4 删除用户
```
POST /api/admin/deleteUser
```

### 10. AI端专用接口

#### 10.1 获取离线摄像头列表
```
GET /api/ai/getOfflineCameraList
```
**请求参数:**
```typescript
{
  adminUsername: string;
  password: string;
}
```

#### 10.2 解析视频流地址
```
GET /api/ai/resolveStream
```
**请求参数:**
```typescript
{
  camera: number;
}
```

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 412 | 先决条件失败 |
| 500 | 服务器内部错误 |

## 数据库实体关系

### 主要实体
- **User**: 用户表
- **Camera**: 摄像头表
- **AlarmRule**: 告警规则表
- **AlarmEvent**: 告警事件表
- **MapConfig**: 地图配置表
- **AIConfig**: AI配置表

### 关系说明
- 一个摄像头可以关联多个告警规则
- 一个告警规则可以应用于多个摄像头
- 一个摄像头可以产生多个告警事件
- 一个用户可以管理多个摄像头

## 部署说明

1. 安装依赖：
```bash
cd backend
npm install
```

2. 配置环境变量：
```bash
cp server.config.env.example server.config.env
# 编辑 server.config.env
```

3. 启动服务：
```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

## 测试示例

### 获取传送带状态
```bash
curl -X GET http://localhost:8080/api/user/getBeltState
```

### 登录测试
```bash
curl -X POST http://localhost:8080/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

### 添加告警事件
```bash
curl -X POST http://localhost:8080/api/user/addAlarmEvent \
  -H "Content-Type: application/json" \
  -d '{
    "cameraID": 1,
    "alarmType": "smoke",
    "picFilePath": "/uploads/alarm/1.jpg",
    "confidence": 0.85,
    "alarmRuleId": 1
  }'
```