import { Test, TestingModule } from '@nestjs/testing';
import { AlarmRuleService } from './alarm-rule.service';

/**
 * AlarmRuleService 的单元测试用例，使用 Jest 进行测试。
 */
describe('AlarmRuleService', () => {
  let service: AlarmRuleService;

  /**
   * 每个测试用例开始之前都会执行的异步钩子：
   *  - 使用 Test.createTestingModule 创建一个 TestingModule。
   *  - 在 providers 中注册需要用到的服务(AlarmRuleService)。
   *  - 编译并获取实际的服务实例，赋值给 service 变量。
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlarmRuleService],
    }).compile();

    // 从测试模块中获取 AlarmRuleService 的实例
    service = module.get<AlarmRuleService>(AlarmRuleService);
  });

  /**
   * 简单的测试用例：判断 service 是否被定义。
   * 如果 service 不为 undefined，则表示初始化成功。
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
