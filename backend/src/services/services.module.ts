import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapConfig } from './map-config/map-config.entity';
import { MapConfigService } from './map-config/map-config.service';
import { UtilsService } from './utils/utils.service';
import { Camera } from './camera/camera.entity';
import { CameraService } from './camera/camera.service';
import { AlarmRule } from './alarm-rule/alarm-rule.entity';
import { AlarmRuleService } from './alarm-rule/alarm-rule.service';
import { User } from './user/user.entity';
import { UserService } from './user/user.service';
import { AlarmEvent } from './alarm-event/alarm-event.entity';
import { AlarmEventService } from './alarm-event/alarm-event.service';
import { AIConfig } from './aiconfig/aiconfig.entity';
import { AIConfigService } from './aiconfig/aiconfig.service';
import { AiEndGateway } from 'src/ws-gateways/ai-end/ai-end.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapConfig,
      Camera,
      AlarmRule,
      User,
      AlarmEvent,
      AIConfig,
    ]),
  ],
  providers: [
    MapConfigService,
    UtilsService,
    CameraService,
    AlarmRuleService,
    UserService,
    AlarmEventService,
    AIConfigService,
    AiEndGateway,
  ],
  exports: [
    MapConfigService,
    UtilsService,
    CameraService,
    AlarmRuleService,
    UserService,
    AlarmEventService,
    AIConfigService,
    AiEndGateway,
  ],
})
export class ServicesModule {}