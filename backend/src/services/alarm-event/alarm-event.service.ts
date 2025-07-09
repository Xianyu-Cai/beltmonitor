// backend/src/services/alarm-event/alarm-event.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Like, Repository } from 'typeorm';
import { AlarmEvent } from './alarm-event.entity';
import { Camera } from '../camera/camera.entity';
import { AlarmRule } from '../alarm-rule/alarm-rule.entity';

@Injectable()
export class AlarmEventService {
  constructor(
    // 注入 AlarmEvent 对应的仓库，用于数据库操作
    @InjectRepository(AlarmEvent)
    private readonly alarmEventRepo: Repository<AlarmEvent>,

    // 如果在 addEvent() 里需要先查摄像头，则注入 Camera 仓库
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,

    // 若需要自动匹配 AlarmRule，则注入 AlarmRule 仓库
    @InjectRepository(AlarmRule)
    private readonly alarmRuleRepo: Repository<AlarmRule>,
  ) {}

  /**
   * 获取报警事件列表，可分页、可筛选、可选择是否关联查询 Camera / AlarmRule。
   * @param withSourceCamera 是否联表查询 sourceCamera
   * @param withAlarmRule 是否联表查询 alarmRule
   * @param current 当前页码
   * @param pageSize 每页大小
   * @param search 查询条件
   */
  async getList(
    withSourceCamera = false,
    withAlarmRule = false,
    current?: number,
    pageSize?: number,
    search?: {
      resolved?: boolean;
      cameraName?: string;
      alarmRuleName?: string;
      cameraID?: number;
    },
  ): Promise<{ total: number; list: AlarmEvent[] }> {
    // 动态组合查询条件
    const findOptions: FindManyOptions<AlarmEvent> = {
      relations: {
        sourceCamera: withSourceCamera,
        alarmRule: withAlarmRule,
      },
      skip: current && pageSize ? (current - 1) * pageSize : undefined,
      take: current && pageSize ? pageSize : undefined,
      where: {
        resolved: search?.resolved,
        sourceCamera: {
          name: search?.cameraName ? Like(`%${search.cameraName}%`) : undefined,
          id: search?.cameraID,
        },
        alarmRule: {
          name: search?.alarmRuleName
            ? Like(`%${search.alarmRuleName}%`)
            : undefined,
        },
      },
      order: {
        id: 'DESC',
      },
    };

    // 获取总数
    const total = await this.alarmEventRepo.count(findOptions);
    // 获取列表
    const list = await this.alarmEventRepo.find(findOptions);

    return { total, list };
  }

  /**
   * 获取所有已处理的报警事件
   */
  async getResolvedList(): Promise<AlarmEvent[]> {
    return await this.alarmEventRepo.find({ where: { resolved: true } });
  }

  /**
   * 获取所有未处理（pending）的报警事件
   */
  async getPenddingList(): Promise<AlarmEvent[]> {
    return await this.alarmEventRepo.find({ where: { resolved: false } });
  }

  /**
   * 获取未处理报警事件的总数量
   */
  async getPendingCount(): Promise<number> {
    return await this.alarmEventRepo.count({ where: { resolved: false } });
  }

  /**
   * 将指定 id 的报警事件标记为已处理
   * @param id 报警事件ID
   */
  async resolve(id: number): Promise<void> {
    const event = await this.alarmEventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`AlarmEvent not found (ID: ${id})`);
    }
    event.resolved = true;
    await this.alarmEventRepo.save(event);
  }

  /**
   * 新增一条报警事件。
   * - 必要字段：cameraID, picFilePath
   * - 可选字段：alarmRuleID, alarmType, confidence, resolved 等
   * - 调用方只需传简单字段，这里在 Service 内部查询并关联 Camera / AlarmRule
   */
  async addEvent(eventData: {
    cameraID: number;         // 摄像头 ID
    alarmRuleID?: number;     // 报警规则 ID（可选）
    alarmType?: string;
    confidence?: number;
    picFilePath: string;
    resolved?: boolean;
  }): Promise<AlarmEvent> {
    // 1. 查找摄像头
    const camera = await this.cameraRepo.findOne({
      where: { id: eventData.cameraID },
    });
    if (!camera) {
      throw new NotFoundException(`Camera not found (ID: ${eventData.cameraID})`);
    }

    // 2. 如果传入 alarmRuleID，则查询 AlarmRule（可能返回 null）
    let rule: AlarmRule | null = null;
    if (eventData.alarmRuleID) {
      rule = await this.alarmRuleRepo.findOne({
        where: { id: eventData.alarmRuleID },
      });
      if (!rule) {
        throw new NotFoundException(
          `AlarmRule not found (ID: ${eventData.alarmRuleID})`,
        );
      }
    }

    // 3. 创建事件实体
    const newEvent = this.alarmEventRepo.create({
      alarmType: eventData.alarmType,
      confidence: eventData.confidence,
      picFilePath: eventData.picFilePath,
      resolved: eventData.resolved ?? false,
      sourceCamera: camera,
      alarmRule: rule || undefined, // 如果 rule === null，则赋 undefined
    });

    // 4. 保存入库
    return await this.alarmEventRepo.save(newEvent);
  }
}
