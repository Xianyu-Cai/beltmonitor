// backend/src/services/ai-config/ai-config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIConfig } from './aiconfig.entity';

@Injectable()
export class AIConfigService {
  constructor(
    @InjectRepository(AIConfig)
    private aiConfigRepository: Repository<AIConfig>,
  ) {}

  async getConfigByCameraId(cameraId: number): Promise<AIConfig> {
    const config = await this.aiConfigRepository.findOne({ where: { cameraId } });
    if (!config) {
      // 如果该摄像头没有配置,返回默认值
      return {
        id: 0,
        belt_scale: 1.0,
        person_region: [0, 0, 1, 1],
        original_region: '0,0,1,1', // 添加默认值为字符串
        smoke_threshold: 0.5,
        large_block_radio: 0.3,
        cameraId,
        camera: undefined
      };
    }
    return config;
  }

  async getConfig(): Promise<AIConfig> {
    const config = await this.aiConfigRepository.findOne({ where: { id: 1 } });
    if (!config) {
      // 如果没有配置,返回默认值
      return {
        id: 1,
        belt_scale: 1.0,
        person_region: [0, 0, 1, 1],
        original_region: '0,0,1,1', // 添加默认值为字符串
        smoke_threshold: 0.5,
        cameraId: undefined,
        camera: undefined
      };
    }
    return config;
  }

  async updateConfigByCameraId(cameraId: number, config: Partial<AIConfig>): Promise<void> {
    const existingConfig = await this.aiConfigRepository.findOne({ where: { cameraId } });
    if (existingConfig) {
      await this.aiConfigRepository.update(existingConfig.id, { ...config, cameraId });
    } else {
      const newConfig = this.aiConfigRepository.create({
        ...config,
        cameraId
      });
      await this.aiConfigRepository.save(newConfig);
    }
  }

  async updateConfig(config: Partial<AIConfig>): Promise<void> {
    const existingConfig = await this.aiConfigRepository.findOne({ where: { id: 1 } });
    if (existingConfig) {
      await this.aiConfigRepository.update(1, config);
    } else {
      const newConfig = this.aiConfigRepository.create({
        id: 1,
        ...config,
      });
      await this.aiConfigRepository.save(newConfig);
    }
  }
}