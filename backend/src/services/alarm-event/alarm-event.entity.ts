// backend/src/services/alarm-event/alarm-event.entity.ts

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Camera } from '../camera/camera.entity';
import { AlarmRule } from '../alarm-rule/alarm-rule.entity';

@Entity()
export class AlarmEvent {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bool', default: false })
  resolved: boolean;

  @Column()
  picFilePath: string;

  // 新增字段：报警类型
  @Column({ nullable: true })
  alarmType?: string;

  // 新增字段：置信度
  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Camera, (camera) => camera.alarmEvents)
  sourceCamera?: Camera;

  @ManyToOne(() => AlarmRule, (alarmRule) => alarmRule.alarmEvents)
  @JoinColumn()
  alarmRule?: AlarmRule;
}
