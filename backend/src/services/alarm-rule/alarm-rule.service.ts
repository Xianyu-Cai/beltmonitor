import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AlarmRule } from './alarm-rule.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AiEndGateway } from 'src/ws-gateways/ai-end/ai-end.gateway';

/**
 * AlarmRuleService 用于管理系统中的报警规则（AlarmRule）：
 *  - 提供对报警规则的增、删、改、查功能；
 *  - 在规则发生变动时，通过 AiEndGateway 通知相关的摄像头进行配置更新。
 */
@Injectable()
export class AlarmRuleService {
  /**
   * 通过注入 AlarmRule 实体对应的 Repository 来进行数据库操作。
   * 同时使用 forwardRef 注入 AiEndGateway，以便在报警规则发生变动时，通知摄像头配置变更。
   */
  constructor(
    @InjectRepository(AlarmRule) private alarmRuleRepo: Repository<AlarmRule>,
    @Inject(forwardRef(() => AiEndGateway))
    private aiEndGateway: AiEndGateway,
  ) {}

  /**
   * 获取所有报警规则的列表，可根据参数选择是否一并查询关联的摄像头和报警事件信息。
   * @param {boolean} [withRelatedCameras=false] 是否联表查询 relatedCameras
   * @param {boolean} [withAlarmEvents=false] 是否联表查询 alarmEvents
   * @returns {Promise<AlarmRule[]>} 返回符合查询条件的报警规则列表
   */
  async getList(
    withRelatedCameras = false,
    withAlarmEvents = false,
  ): Promise<AlarmRule[]> {
    return await this.alarmRuleRepo.find({
      relations: {
        relatedCameras: withRelatedCameras,
        alarmEvents: withAlarmEvents,
      },
    });
  }

  /**
   * 根据 ruleID 获取单个报警规则的信息，可选择是否联表查询关联的摄像头和报警事件信息。
   * @param {number} ruleID 报警规则的唯一 ID
   * @param {boolean} [withRelatedCameras=false] 是否联表查询 relatedCameras
   * @param {boolean} [withAlarmEvents=false] 是否联表查询 alarmEvents
   * @returns {Promise<AlarmRule | null>} 返回查询到的报警规则，若不存在则返回 null
   */
  async getById(
    ruleID: number,
    withRelatedCameras = false,
    withAlarmEvents = false,
  ): Promise<AlarmRule | null> {
    return await this.alarmRuleRepo.findOne({
      where: { id: ruleID },
      relations: {
        relatedCameras: withRelatedCameras,
        alarmEvents: withAlarmEvents,
      },
    });
  }

  /**
   * 新增一条报警规则，并通知相关的摄像头进行配置更新。
   * @param {Partial<AlarmRule>} rule 需要添加的报警规则对象(部分字段即可)
   * @returns {Promise<void>} 无返回值
   */
  async addRule(rule: Partial<AlarmRule>) {
    // 保存新的报警规则
    const savedRule = await this.alarmRuleRepo.save(rule);

    // 如果该规则关联了摄像头，则通知每个摄像头进行配置更新
    await Promise.all(
      savedRule.relatedCameras?.map((camera) =>
        this.aiEndGateway.notifyCameraConfigChange(camera.id),
      ) ?? [],
    );
  }

  /**
   * 更新已存在的报警规则信息，并通知相关摄像头进行配置更新。
   * @param {Partial<AlarmRule>} rule 需要更新的报警规则对象，必须包含有效的 rule.id
   * @returns {Promise<void>} 无返回值
   */
  async updateRule(rule: Partial<AlarmRule>) {
    // 若未提供 ID，无法进行更新
    if (!rule.id) return;

    // 获取原始规则信息（含摄像头列表），用于对比更新前后关联的摄像头
    const originalRule = await this.getById(rule.id, true);

    // 保存更新后的规则
    const savedRule = await this.alarmRuleRepo.save(rule);

    // 整合更新前后规则所关联的所有摄像头 ID
    const relatedCameraIds = [
      ...new Set(
        [
          ...(originalRule?.relatedCameras ?? []),
          ...(savedRule?.relatedCameras ?? []),
        ].map((camera) => camera.id),
      ),
    ];

    // 通知所有受影响的摄像头进行配置更新
    await Promise.all(
      relatedCameraIds.map((cameraId) =>
        this.aiEndGateway.notifyCameraConfigChange(cameraId),
      ),
    );
  }

  /**
   * 根据 ruleID 软删除（标记删除）指定的报警规则，并通知相关摄像头进行配置更新。
   * @param {number} ruleID 需要删除的报警规则 ID
   * @returns {Promise<void>} 无返回值
   */
  async deleteRule(ruleID: number) {
    // 查询是否存在该规则，以及该规则关联的摄像头
    const rule = await this.getById(ruleID, true);
    if (!rule) return;

    // 执行软删除操作
    await this.alarmRuleRepo.softDelete({ id: ruleID });

    // 通知所有受影响的摄像头进行配置更新
    await Promise.all(
      rule.relatedCameras?.map((camera) =>
        this.aiEndGateway.notifyCameraConfigChange(camera.id),
      ) ?? [],
    );
  }
}
