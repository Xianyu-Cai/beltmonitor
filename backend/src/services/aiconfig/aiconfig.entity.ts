import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Camera } from '../camera/camera.entity';

@Entity()
export class AIConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float')
  belt_scale: number;

  @Column('simple-array')
  person_region: number[];
  
  @Column('text', { nullable: true })
  original_region: string;

  @Column('float')
  smoke_threshold: number;

  @Column({ nullable: true })
  cameraId?: number;

  @Column('float')
  large_block_radio?: number;

  @ManyToOne(() => Camera, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cameraId' })
  camera?: Camera;
}