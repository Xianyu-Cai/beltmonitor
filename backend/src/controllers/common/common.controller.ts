import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CameraService } from 'src/services/camera/camera.service';

import { UserService } from 'src/services/user/user.service';
import { UtilsService } from 'src/services/utils/utils.service';
import { FetchTypes } from 'src/types/fetchTypes';

@Controller()
export class CommonController {
  constructor(
    private readonly userService: UserService,
    private utilService: UtilsService,
    private cameraService: CameraService,
  ) { }

  @Post('/api/user/login')
  async userLogin(
    @Body() data: FetchTypes['POST /api/user/login']['req'],
  ): Promise<FetchTypes['POST /api/user/login']['res']['data']> {
    const user = await this.userService.authLogin(data.username, data.password);

    if (user) {
      return {
        success: true,
        userInfo: {
          username: user.username,
          role: user.role,
          nickname: user.nickname,
          tel: user.tel ?? '',
          email: user.email ?? '',
          avatarURL: user.avatarFilePath
            ? this.utilService.filePathToURL(user.avatarFilePath)
            : '',
        },
      };
    } else {
      return {
        success: false,
        userInfo: {
          username: '',
          role: '',
          nickname: '',
          tel: '',
          email: '',
          avatarURL: '',
        }
      };
    };
  }

  @Get('/api/ai/getOfflineCameraList')
  async getOfflineCameraList(
    @Query() data: FetchTypes['GET /api/ai/getOfflineCameraList']['req'],
  ): Promise<FetchTypes['GET /api/ai/getOfflineCameraList']['res']['data']> {
    const user = await this.userService.authLogin(
      data.adminUsername,
      data.password,
    );
    if (!user || user.role !== 'admin') throw new UnauthorizedException();

    const list = await this.cameraService.getOfflineList();
    return list.map((camera) => ({
      cameraID: camera.id,
    }));
  }

  @Get('/api/ai/resolveStream')
  async resolveStream(
    @Query() data: FetchTypes['GET /api/ai/resolveStream']['req'],
  ): Promise<FetchTypes['GET /api/ai/resolveStream']['res']> {
    const streamUrl = await this.cameraService.getHlsUrl(data.camera);
    return { StreamUrl: streamUrl };
  }
}
