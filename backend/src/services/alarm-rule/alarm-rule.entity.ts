import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Camera } from '../camera/camera.entity';
import { AlarmEvent } from '../alarm-event/alarm-event.entity';

/**
 * AlarmRule 实体类，用于定义和存储系统中报警规则的详细信息。
 */
@Entity()
export class AlarmRule {
  /**
   * 报警规则的主键 ID，自动递增。
   */
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /**
   * 报警规则的名称。
   */
  @Column()
  name: string;

  /**
   * 是否启用该规则。
   */
  @Column()
  enabled: boolean;

  /**
   * 算法类型，可取以下值：
   *  - 'belt'
   *  - 'coal'
   *  - 'big_block'
   *  - 'left_axis'
   *  - 'right_axis'
   *  - 'foreign_object'
   *  - 'personnel'
   */
  @Column()
  algorithmType:
    | 'belt'
    | 'coal'
    | 'big_block'
    | 'left_axis'
    | 'right_axis'
    | 'foreign_object'
    | 'personnel';

  /**
   * 规则生效的星期几（0-6），以数组形式存储。
   * 例如：[1, 3, 5] 表示每周一、三、五生效。
   */
  @Column({ type: 'json' })
  triggerDayOfWeek: number[];

  /**
   * 规则生效的开始时间（HH:mm:ss 格式）。
   */
  @Column()
  triggerTimeStart: string;

  /**
   * 规则生效的结束时间（HH:mm:ss 格式）。
   */
  @Column()
  triggerTimeEnd: string;

  /**
   * 触发报警需要的最小识别次数。
   */
  @Column({ type: 'int' })
  triggerCountMin: number;

  /**
   * 触发报警允许的最大识别次数。
   */
  @Column({ type: 'int' })
  triggerCountMax: number;

  /**
   * 创建时间，自动由数据库管理。
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 更新时间，自动由数据库管理。
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 删除时间，用于软删除，自动由数据库管理。
   */
  @DeleteDateColumn()
  deletedAt: Date;

  /**
   * 与 Camera 实体为多对多关系，代表该规则可关联多个摄像头。
   */
  @ManyToMany(() => Camera, (camera) => camera.alarmRules)
  @JoinTable()
  relatedCameras?: Camera[];

  /**
   * 与 AlarmEvent 实体为一对多关系，一个规则可产生多个事件。
   */
  @OneToMany(() => AlarmEvent, (alarmEvent) => alarmEvent.alarmRule)
  alarmEvents?: AlarmEvent[];
}
