import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  PreconditionFailedException,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { UserInfo } from 'src/decorators/userinfo/userinfo.decorator';
import { AuthGuard } from 'src/guards/auth/auth.guard';
import { RoleGuard } from 'src/guards/role/role.guard';
import { AlarmEventService } from 'src/services/alarm-event/alarm-event.service';
import { CameraService } from 'src/services/camera/camera.service';
import { MapConfigService } from 'src/services/map-config/map-config.service';
import { UserService } from 'src/services/user/user.service';
import { UtilsService } from 'src/services/utils/utils.service';
import { FetchTypes } from 'src/types/fetchTypes';

@Controller()
// @SetMetadata('role', 'user')
// @UseGuards(AuthGuard, RoleGuard)
export class UserController {
  constructor(
    private cameraService: CameraService,
    private alarmEventService: AlarmEventService,
    private userService: UserService,
    private utilsService: UtilsService,
    private mapConfigService: MapConfigService,
  ) { }

  @Get('/api/user/getBeltState')
  async getBeltState(): Promise<{
    cameraTotal: number;
    cameraOnline: number;
    cameraAlarm: number;
    alarmEventPending: number;
    cameraList: {
      cameraName: string;
      cameraID: number;
      cameraStatus: string;
      cameraModel: string;
      rtspUrl: string;
      alarmRules: {
        alarmRuleID: number;
        alarmRuleName: string;
      }[];
      latlng: [number, number];
    }[];
  }> {
    const cameraList = await this.cameraService.getList(true, true);
    let cameraOnline = 0,
      cameraAlarm = 0;

    const cameraListRes = cameraList.map((camera) => {
      if (camera.online) cameraOnline++;
      if (this.cameraService.getCameraStatus(camera) === 'alarm') cameraAlarm++;
      return {
        cameraName: camera.name,
        cameraID: camera.id,
        cameraStatus: this.cameraService.getCameraStatus(camera),
        cameraModel: camera.model,
        rtspUrl: camera.rtspUrl,
        alarmRules:
          camera.alarmRules?.map((rule) => ({
            alarmRuleID: rule.id,
            alarmRuleName: rule.name,
          })) || [],
        latlng: [Number(camera.latitude), Number(camera.longitude)] as [
          number,
          number,
        ],
      };
    });

    return {
      cameraTotal: cameraList.length,
      cameraOnline,
      cameraAlarm,
      alarmEventPending: await this.alarmEventService.getPendingCount(),
      cameraList: cameraListRes,
    };
  }

  @Get('/api/user/getCameraInfo')
  async getCameraInfo(
    @Query('cameraID')
    cameraID: FetchTypes['GET /api/user/getCameraInfo']['req']['cameraID'],
  ): Promise<FetchTypes['GET /api/user/getCameraInfo']['res']['data']> {
    const camera = await this.cameraService.getById(cameraID, true, true);
    if (!camera) throw new NotFoundException('Camera not found');

    return {
      cameraName: camera.name,
      cameraID: camera.id,
      cameraStatus: this.cameraService.getCameraStatus(camera),
      hlsUrl: await this.cameraService.getHlsUrl(camera.id),
      latlng: [Number(camera.latitude), Number(camera.longitude)] as [
        number,
        number,
      ],
      cameraModel: camera.model,
      alarmRules:
        camera.alarmRules?.map((rule) => ({
          alarmRuleID: rule.id,
          alarmRuleName: rule.name,
        })) ?? [],
      alarmEvents:
        camera.alarmEvents?.map((event) => ({
          eventID: event.id,
          alarmTime: dayjs(event.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          alarmRule: {
            alarmRuleID: event?.alarmRule?.id ?? 0,
            alarmRuleName: event?.alarmRule?.name ?? '',
          },
          resolved: event.resolved,
        })) ?? [],
    };
  }

  @Post('/api/user/resolveAlarm')
  async resolveAlarm(
    @Body('eventID')
    eventID: FetchTypes['POST /api/user/resolveAlarm']['req']['eventID'],
  ): Promise<FetchTypes['POST /api/user/resolveAlarm']['res']['data']> {
    await this.alarmEventService.resolve(eventID);
    return {};
  }

  @Get('/api/user/getAlarmEvents')
  async getAlarmEvents(
    @Query()
    query: FetchTypes['GET /api/user/getAlarmEvents']['req'],
  ): Promise<FetchTypes['GET /api/user/getAlarmEvents']['res']['data']> {
    const res = await this.alarmEventService.getList(
      true,
      true,
      query.current,
      query.pageSize,
      {
        resolved:
          query.resolved === 'true'
            ? true
            : query.resolved === 'false'
              ? false
              : undefined,
        cameraID: query.cameraID,
        alarmRuleName: query.alarmType,
        cameraName: query.cameraName,
      },
    );

    return {
      list:
        res.list.map((event) => ({
          eventID: event.id,
          alarmTime: dayjs(event.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          alarmRule: {
            alarmRuleID: event?.alarmRule?.id ?? 0,
            alarmRuleName: event?.alarmRule?.name ?? '',
          },
          resolved: event.resolved,
          cameraID: event?.sourceCamera?.id ?? 0,
          cameraName: event?.sourceCamera?.name ?? '',
          cameraLatlng: [
            Number(event?.sourceCamera?.latitude),
            Number(event?.sourceCamera?.longitude),
          ] as [number, number],
          cameraModel: event?.sourceCamera?.model ?? '',
          alarmPicUrl: this.utilsService.filePathToURL(event.picFilePath),
        })) ?? [],
      total: res.total,
    };
  }

  @Get('/api/user/getMonitList')
  async getMonitList(): Promise<
    FetchTypes['GET /api/user/getMonitList']['res']['data']
  > {
    const cameraList = await this.cameraService.getList(false, true);
    return Promise.all(
      cameraList.map(async (camera) => ({
        cameraID: camera.id,
        cameraName: camera.name,
        cameraStatus: this.cameraService.getCameraStatus(camera),
        hlsUrl: await this.cameraService.getHlsUrl(camera.id),
      }))
    );
  }

  @Get('/api/user/getUserInfo')
  async getUserInfo(
    @UserInfo('username') username: string,
  ): Promise<FetchTypes['GET /api/user/getUserInfo']['res']['data']> {
    const userInfo = await this.userService.getByUsername(username);
    if (!userInfo) throw new NotFoundException('User not found');
    return {
      username: userInfo.username,
      nickname: userInfo.nickname,
      email: userInfo.email ?? '',
      tel: userInfo.tel ?? '',
      role: userInfo.role,
      avatarURL: userInfo.avatarFilePath
        ? this.utilsService.filePathToURL(userInfo.avatarFilePath)
        : '',
    };
  }

  @Post('/api/user/updateUserInfo')
  async updateUserInfo(
    @Body() body: FetchTypes['POST /api/user/updateUserInfo']['req'],
    @UserInfo('username') username: string,
  ): Promise<FetchTypes['POST /api/user/updateUserInfo']['res']['data']> {
    if (username !== body.username || (body as any).password) {
      throw new ForbiddenException('Permission denied');
    }

    if (body.avatarURL.startsWith('data:image')) {
      const avatarFilePath = await this.utilsService.writeBase64ImageToFile(
        body.avatarURL,
      );
      await this.userService.updateUser({
        username: username,
        nickname: body.nickname,
        email: body.email,
        tel: body.tel,
        avatarFilePath,
      });
    } else {
      await this.userService.updateUser({
        username: username,
        nickname: body.nickname,
        email: body.email,
        tel: body.tel,
      });
    }

    return {};
  }

  @Post('/api/user/updatePassword')
  async updatePassword(
    @Body() body: FetchTypes['POST /api/user/updatePassword']['req'],
    @UserInfo('username') username: string,
  ): Promise<FetchTypes['POST /api/user/updatePassword']['res']['data']> {
    const user = await this.userService.getByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    if (body.oldPassword !== user.password) {
      throw new PreconditionFailedException('旧密码不正确');
    }

    await this.userService.updateUser({
      username: username,
      password: body.newPassword,
    });

    return {};
  }

  @Get('/api/user/getMapConfig')
  async getMapConfig(): Promise<
    FetchTypes['GET /api/user/getMapConfig']['res']['data']
  > {
    const config = await this.mapConfigService.getLatestConfig();
    if (!config) throw new NotFoundException('Map config not found');

    return {
      layer:
        config.layerType === 'imageOverlay'
          ? {
            type: 'imageOverlay',
            url: this.utilsService.filePathToURL(config.layerUrlOrPath),
            bounds: config.imageLayerBounds as [
              [number, number],
              [number, number],
            ],
          }
          : {
            type: 'tileLayer',
            url: config.layerUrlOrPath,
          },
      mapOptions: {
        center: config.mapCenter,
        zoom: config.mapZoom,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        attributionControl: false,
        zoomControl: false,
      },
    };
  }

  // === 新增: 报警事件上报接口 ===
  @Post('/api/user/addAlarmEvent')
  async addAlarmEvent(
    @Body() body: FetchTypes['POST /api/user/addAlarmEvent']['req'],
  ): Promise<FetchTypes['POST /api/user/addAlarmEvent']['res']> {
    // 从请求体中提取所需字段，包括alarmRuleId
    const { cameraID, alarmType, picFilePath, confidence, alarmRuleId } = body;

    // 调用服务添加事件，传递alarmRuleId参数
    const newEvent = await this.alarmEventService.addEvent({
      cameraID,
      alarmRuleID: alarmRuleId, // 如果提供了alarmRuleId，则传递给service
      alarmType,
      picFilePath,
      confidence,
      resolved: false,
    });

    return {
      success: true,
      message: '报警事件已成功写入数据库',
      data: {
        eventID: newEvent.id,
      },
    };
  }
}
