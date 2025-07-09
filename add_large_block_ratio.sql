-- 添加大块比例字段到ai_config表
ALTER TABLE `ai_config` 
ADD COLUMN `large_block_ratio` FLOAT DEFAULT 0.3 COMMENT '大块报警比例阈值(0-1)';

-- 更新现有记录的large_block_ratio字段
UPDATE `ai_config` SET `large_block_ratio` = 0.3;
