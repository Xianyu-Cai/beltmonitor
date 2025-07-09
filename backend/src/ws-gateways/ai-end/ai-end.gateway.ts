import { Inject, forwardRef } from '@nestjs/common';
import {
  WebSocketServer,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, ServerOptions, Socket } from 'socket.io';
import { AlarmEventService } from 'src/services/alarm-event/alarm-event.service';
import { CameraService } from 'src/services/camera/camera.service';
import { UserService } from 'src/services/user/user.service';
import { UtilsService } from 'src/services/utils/utils.service';
import { AIConfigService } from 'src/services/aiconfig/aiconfig.service';

interface ClientInfo {
  username: string;
  password: string;
  cameraID: string; // 注意是 string，需要 parseInt() 转换为 number
}

/**
 * 前端/AI 端发送的报警数据：
 *  - picBase64: 报警截图的 Base64
 *  - alarmRuleID: 触发报警的规则 ID
 *  - (可扩展其他字段，比如 confidence, alarmType 等)
 */
interface AlarmData {
  picBase64: string;
  alarmRuleID: number;
}

/**
 * AIConfig，用于下发AI配置信息给 AI 端
 */
interface AIConfigData {
  belt_scale: number;
  person_region: number[];
  original_region: string;
  smoke_threshold: number;
}

/**
 * CameraConfig，用于下发摄像头配置信息给 AI 端
 */
interface CameraConfig {
  rtspUrl: string;
  alarmRules: any[]; // 或者 AlarmRule[]，视您业务实体而定
  aiConfig?: AIConfigData; // 新增的AI配置信息
}

@WebSocketGateway<Partial<ServerOptions>>({
  path: '/ws/ai/',
  cors: {},
  serveClient: false,
})
export class AiEndGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  wsServer: Server;

  // 保存已连接客户端，key 为 cameraID（字符串），value 为 Socket 实例
  connecetedClients: Map<string, Socket> = new Map();

  constructor(
    @Inject(forwardRef(() => CameraService))
    private cameraService: CameraService,

    @Inject(forwardRef(() => AlarmEventService))
    private alarmEventService: AlarmEventService,

    @Inject(forwardRef(() => UserService))
    private userService: UserService,

    @Inject(forwardRef(() => UtilsService))
    private utilsService: UtilsService,
    
    @Inject(forwardRef(() => AIConfigService))
    private aiConfigService: AIConfigService,
  ) {}

  /**
   * 测试用消息，客户端发送 "message" 时的回调
   */
  @SubscribeMessage('message')
  handleMessage(@MessageBody() body: string, @ConnectedSocket() client: Socket) {
    console.log('message received:', body);
    client.emit('message', 'hello from server');
  }

  /**
   * 当 AI 端发送 "alarm" 消息时，表示检测到了报警事件
   */
  @SubscribeMessage('alarm')
  async handleAlarm(
    @MessageBody() body: AlarmData,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('alarm received:', body);

    // 1. 从 client.data 中取出摄像头 ID（string），转换为 number
    const { cameraID } = client.data as ClientInfo;
    const parsedCameraID = parseInt(cameraID, 10);

    // 2. 将 Base64 图片写到文件系统，得到本地保存路径
    const picFilePath = await this.utilsService.writeBase64ImageToFile(
      body.picBase64,
    );

    // 3. 调用 alarmEventService，新增报警事件
    //    只传 cameraID, alarmRuleID, picFilePath(及其他可能的字段)，
    //    由 Service 内部自动查询并关联 Camera, AlarmRule
    await this.alarmEventService.addEvent({
      cameraID: parsedCameraID,
      alarmRuleID: body.alarmRuleID,
      picFilePath,
      // 如果需要置信度或其他信息，也可传：
      // confidence: 0.95,
      // alarmType: 'foreign_object',
      // resolved: false, // 默认未处理
    });

    // 如果需要给 AI 端回执，可以在此发送:
    // client.emit('alarmAck', { success: true });
  }

  /**
   * 主动通知 AI 端（cameraID 对应的 socket）更新配置信息
   */
  async notifyCameraConfigChange(cameraID: number, cameraConfig?: CameraConfig) {
    const client = this.connecetedClients.get(cameraID.toString());
    if (!client) return;

    // 如果外部没传 cameraConfig，则从数据库查 Camera 并组装
    if (!cameraConfig) {
      const config = await this.cameraService.getById(cameraID, true);
      if (!config) return;
      
      // 获取该摄像头的AI配置
      const aiConfig = await this.aiConfigService.getConfigByCameraId(cameraID);
      
      cameraConfig = {
        alarmRules: config.alarmRules ?? [],
        rtspUrl: config.rtspUrl,
        aiConfig: {
          belt_scale: aiConfig.belt_scale,
          person_region: aiConfig.person_region,
          original_region: aiConfig.original_region,
          smoke_threshold: aiConfig.smoke_threshold
        }
      };
    }

    client.emit('cameraConfigChange', cameraConfig);
    console.log(`notifyCameraConfigChange: cameraID=${cameraID}`);
  }

  /**
   * 主动断开某个 cameraID 的 socket 连接
   */
  async disconnectClient(cameraID: number) {
    const client = this.connecetedClients.get(cameraID.toString());
    client?.disconnect();
  }

  /**
   * 有新客户端连接时触发
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // 1. 解析自定义头 data (JSON 字符串)
      if (typeof client.client.request.headers.data !== 'string') {
        client.disconnect();
        return;
      }
      const data: ClientInfo = JSON.parse(client.client.request.headers.data);

      // 2. 用户鉴权，只有 admin 才允许连接
      const user = await this.userService.authLogin(data.username, data.password);
      if (user?.role !== 'admin') {
        client.disconnect();
        return;
      }

      // 3. 若已有旧连接，则先断开它
      if (this.connecetedClients.has(data.cameraID)) {
        this.connecetedClients.get(data.cameraID)?.disconnect();
        this.connecetedClients.delete(data.cameraID);
        await sleep(1000);
      }

      // 4. 更新摄像头在线状态
      const camera = await this.cameraService.getById(
        parseInt(data.cameraID, 10),
        false,
        true,
      );
      if (!camera) {
        client.disconnect();
        return;
      }
      await this.cameraService.updateCamera({
        id: parseInt(data.cameraID, 10),
        online: true,
      });

      // 5. 记录连接到 connecetedClients
      client.data = data;
      this.connecetedClients.set(data.cameraID, client);

      console.log(`client cameraID=${data.cameraID} connected`);

      // 6. 通知 camera 更新配置信息
      await this.notifyCameraConfigChange(parseInt(data.cameraID, 10));
    } catch (err) {
      console.error('handleConnection error:', err);
      client.disconnect();
    }
  }

  /**
   * 当客户端断开连接时触发
   */
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    this.connecetedClients.delete(client.data.cameraID);
    client.removeAllListeners();

    const data = client.data as ClientInfo;
    const cameraIDNum = parseInt(data.cameraID, 10);

    // 更新摄像头在线状态
    await this.cameraService.updateCamera({ id: cameraIDNum, online: false });
    console.log(`client cameraID=${data.cameraID} disconnected`);
  }
}

/**
 * 简单的 sleep 工具，用于在断开旧连接后稍作等待
 */
const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
