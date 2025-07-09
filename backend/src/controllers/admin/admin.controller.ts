import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth/auth.guard';
import { RoleGuard } from 'src/guards/role/role.guard';
import { AlarmRule } from 'src/services/alarm-rule/alarm-rule.entity';
import { AlarmRuleService } from 'src/services/alarm-rule/alarm-rule.service';
import { Camera } from 'src/services/camera/camera.entity';
import { CameraService } from 'src/services/camera/camera.service';
import { MapConfigService } from 'src/services/map-config/map-config.service';
import { UserService } from 'src/services/user/user.service';
import { UtilsService } from 'src/services/utils/utils.service';
import { AIConfigService } from 'src/services/aiconfig/aiconfig.service';
import { AiEndGateway } from 'src/ws-gateways/ai-end/ai-end.gateway';
import { FetchTypes } from 'src/types/fetchTypes';

@Controller()
// @SetMetadata('role', 'admin')
// @UseGuards(AuthGuard, RoleGuard)
export class AdminController {
  constructor(
    private readonly mapConfigService: MapConfigService,
    private readonly utilsService: UtilsService,
    private readonly cameraService: CameraService,
    private readonly alarmRuleService: AlarmRuleService,
    private readonly userService: UserService,
    private readonly aiConfigService: AIConfigService,
    private readonly aiEndGateway: AiEndGateway,
  ) { }

  @Post('/api/admin/updateMapConfig')
  async updateMapConfig(@Body() body: any): Promise<any> {
    if (
      body.layer.type === 'imageOverlay' &&
      body.layer.url.startsWith('data:image')
    ) {
      const filePath = await this.utilsService.writeBase64ImageToFile(
        body.layer.url,
      );
      await this.mapConfigService.updateConfig({
        layerType: 'imageOverlay',
        layerUrlOrPath: filePath,
        imageLayerBounds: body.layer.bounds,
        mapCenter: body.mapOptions.center,
        mapZoom: body.mapOptions.zoom,
        minZoom: body.mapOptions.minZoom,
        maxZoom: body.mapOptions.maxZoom,
      });
    } else {
      await this.mapConfigService.updateConfig({
        layerType: 'tileLayer',
        layerUrlOrPath: body.layer.url,
        mapCenter: body.mapOptions.center,
        mapZoom: body.mapOptions.zoom,
        minZoom: body.mapOptions.minZoom,
        maxZoom: body.mapOptions.maxZoom,
      });
    }

    return {};
  }

  @Get('/api/admin/aiconfig')
  async getAIConfig(): Promise<any> {
    const config = await this.aiConfigService.getConfig();
    return {
      belt_scale: config.belt_scale,
      person_region: config.person_region as [number, number, number, number],
      original_region: config.original_region,
      smoke_threshold: config.smoke_threshold,
    };
  }

  @Post('/api/admin/aiconfig')
  async updateAIConfig(@Body() body: any): Promise<void> {
    await this.aiConfigService.updateConfig(body);
    this.aiEndGateway.wsServer.emit('updateConfig', body);
  }

  @Get('/api/admin/getCameraList')
  async getCameraList(): Promise<any> {
    const list = await this.cameraService.getList(true, true);
    return list.map((camera) => ({
      cameraID: camera.id,
      cameraName: camera.name,
      cameraStatus: this.cameraService.getCameraStatus(camera),
      latlng: [Number(camera.latitude), Number(camera.longitude)],
      cameraModel: camera.model,
      hlsUrl: this.cameraService.getHlsUrl(camera.id),
      rtspUrl: camera.rtspUrl,
      alarmRules:
        camera.alarmRules?.map((rule) => ({
          alarmRuleID: rule.id,
          alarmRuleName: rule.name,
        })) || [],
    }));
  }

  @Post('/api/admin/addCamera')
  async addCamera(@Body() body: any): Promise<any> {
    await this.cameraService.addCamera({
      name: body.cameraName,
      model: body.cameraModel,
      latitude: body.latlng[0],
      longitude: body.latlng[1],
      rtspUrl: body.rtspUrl,
      hlsUrl: body.hlsUrl, // 添加 hlsUrl 字段
      alarmRules:
        body.alarmRuleIDs?.map((id: number) => {
          const rule = new AlarmRule();
          rule.id = id;
          return rule;
        }) || [],
    });

    return {};
  }

  @Post('/api/admin/updateCamera')
  async updateCamera(@Body() body: any): Promise<any> {
    const updateData: any = {
      id: body.cameraID,
    };

    // 只更新提供的字段，避免将未提供的字段设为undefined
    if (body.cameraName !== undefined) updateData.name = body.cameraName;
    if (body.cameraModel !== undefined) updateData.model = body.cameraModel;
    if (body.latlng && Array.isArray(body.latlng) && body.latlng.length >= 2) {
      updateData.latitude = body.latlng[0];
      updateData.longitude = body.latlng[1];
    }
    if (body.rtspUrl !== undefined) updateData.rtspUrl = body.rtspUrl;
    if (body.hlsUrl !== undefined) updateData.hlsUrl = body.hlsUrl;

    // 只有在提供了alarmRuleIDs时才处理
    if (body.alarmRuleIDs && Array.isArray(body.alarmRuleIDs)) {
      updateData.alarmRules = body.alarmRuleIDs.map((id: number) => {
        const rule = new AlarmRule();
        rule.id = id;
        return rule;
      });
    }

    await this.cameraService.updateCamera(updateData);
    return { success: true, message: '摄像头更新成功' };
  }

  @Post('/api/admin/deleteCamera')
  async deleteCamera(@Body() body: any): Promise<any> {
    await this.cameraService.deleteCamera(body.cameraID);
    return {};
  }

  @Get('/api/admin/getAlarmRuleList')
  async getAlarmRuleList(): Promise<any> {
    const list = await this.alarmRuleService.getList(true);

    return list.map((rule) => ({
      alarmRuleID: rule.id,
      alarmRuleName: rule.name,
      enabled: rule.enabled,
      algorithmType: rule.algorithmType,
      relatedCameras:
        rule.relatedCameras?.map((camera) => ({
          cameraID: camera.id,
          cameraName: camera.name,
        })) || [],
      triggerCondition: {
        time: {
          dayOfWeek: rule.triggerDayOfWeek,
          timeRange: [rule.triggerTimeStart, rule.triggerTimeEnd],
        },
        count: {
          min: rule.triggerCountMin,
          max: rule.triggerCountMax,
        },
      },
    }));
  }

  @Post('/api/admin/addAlarmRule')
  async addAlarmRule(@Body() body: any): Promise<any> {
    await this.alarmRuleService.addRule({
      name: body.alarmRuleName,
      enabled: body.enabled,
      algorithmType: body.algorithmType,
      relatedCameras: body.relatedCameraIds.map((id: number) => {
        const camera = new Camera();
        camera.id = id;
        return camera;
      }),
      triggerDayOfWeek: body.triggerCondition.time.dayOfWeek,
      triggerTimeStart: body.triggerCondition.time.timeRange[0],
      triggerTimeEnd: body.triggerCondition.time.timeRange[1],
      triggerCountMin: body.triggerCondition.count.min,
      triggerCountMax: body.triggerCondition.count.max,
    });

    return {};
  }

  @Post('/api/admin/updateAlarmRule')
  async updateAlarmRule(@Body() body: any): Promise<any> {
    await this.alarmRuleService.updateRule({
      id: body.alarmRuleID,
      name: body.alarmRuleName,
      enabled: body.enabled,
      algorithmType: body.algorithmType,
      relatedCameras: body.relatedCameraIds.map((id: number) => {
        const camera = new Camera();
        camera.id = id;
        return camera;
      }),
      triggerDayOfWeek: body.triggerCondition.time.dayOfWeek,
      triggerTimeStart: body.triggerCondition.time.timeRange[0],
      triggerTimeEnd: body.triggerCondition.time.timeRange[1],
      triggerCountMin: body.triggerCondition.count.min,
      triggerCountMax: body.triggerCondition.count.max,
    });

    return {};
  }

  @Post('/api/admin/deleteAlarmRule')
  async deleteAlarmRule(@Body() body: any): Promise<any> {
    await this.alarmRuleService.deleteRule(body.alarmRuleID);
    return {};
  }

  @Get('/api/admin/getUserList')
  async getUserList(): Promise<any> {
    const list = await this.userService.getUserList();
    return list.map((user) => ({
      username: user.username,
      avatarURL: user.avatarFilePath
        ? this.utilsService.filePathToURL(user.avatarFilePath)
        : '',
      email: user.email ?? '',
      tel: user.tel ?? '',
      nickname: user.nickname,
      role: user.role,
    }));
  }

  @Post('/api/admin/addUser')
  async addUser(@Body() body: any): Promise<any> {
    await this.userService.addUser({
      username: body.username,
      password: body.password,
      role: body.role,
      nickname: body.nickname,
      email: body.email,
      tel: body.tel,
    });

    return {};
  }

  @Post('/api/admin/updateUser')
  async updateUser(@Body() body: any): Promise<any> {
    await this.userService.updateUser({
      username: body.username,
      password: body.newPassword,
      role: body.role,
      nickname: body.nickname,
      email: body.email,
      tel: body.tel,
    });

    return {};
  }

  @Post('/api/admin/deleteUser')
  async deleteUser(@Body() body: any): Promise<any> {
    await this.userService.deleteUser(body.username);
    return {};
  }

  @Get('/api/admin/getCameraAIConfig')
  async getCameraAIConfig(@Query('cameraId') cameraId: number): Promise<any> {
    if (!cameraId) {
      // 如果没有指定cameraId，返回默认配置
      return this.getAIConfig();
    }

    const config = await this.aiConfigService.getConfigByCameraId(cameraId);
    return {
      success: true,
      message: '获取成功',
      data: {
        belt_scale: config.belt_scale,
        person_region: config.person_region as [number, number, number, number],
        original_region: config.original_region, // 作为字符串返回，无需类型转换
        smoke_threshold: config.smoke_threshold,
        large_block_radio: config.large_block_radio,
      }
    };
  }

  @Post('/api/admin/updateCameraAIConfig')
  async updateCameraAIConfig(@Body() body: any): Promise<any> {
    const { cameraId, ...configData } = body;

    if (!cameraId) {
      throw new Error('缺少摄像头ID');
    }

    await this.aiConfigService.updateConfigByCameraId(cameraId, configData);

    // 通知对应的AI端
    const cameraConfig = await this.cameraService.getById(cameraId, true);
    if (cameraConfig) {
      const aiConfig = await this.aiConfigService.getConfigByCameraId(cameraId);
      await this.aiEndGateway.notifyCameraConfigChange(cameraId, {
        rtspUrl: cameraConfig.rtspUrl,
        alarmRules: cameraConfig.alarmRules ?? [],
        aiConfig: {
          belt_scale: aiConfig.belt_scale,
          person_region: aiConfig.person_region,
          original_region: aiConfig.original_region,
          smoke_threshold: aiConfig.smoke_threshold
        }
      });
    }

    return {
      success: true,
      message: '配置已更新'
    };
  }
}