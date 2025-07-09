import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { join } from 'path';

import { ControllersModule } from './controllers/controllers.module';
import { WsGatewaysModule } from './ws-gateways/ws-gateways.module';
import { AIConfig } from './services/aiconfig/aiconfig.entity';
import { AIConfigService } from './services/aiconfig/aiconfig.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'server.config.env',
    }),

    // TypeORM 配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('MYSQL_HOST'),
        port: parseInt(configService.get<string>('MYSQL_PORT') || '3306', 10),
        username: configService.get<string>('MYSQL_USER'),
        password: configService.get<string>('MYSQL_PASSWORD'),
        database: configService.get<string>('MYSQL_DATABASE'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: true,
        dropSchema: false,
        timezone: 'Z',
        logging: true,
        authPlugins: {
          mysql_native_password: () => () => {}
        }
      }),
    }),

    // Cache 配置
    CacheModule.register({
      isGlobal: true,
      ttl: 300000,
      max: 100,
    }),

    // AI配置实体注册
    TypeOrmModule.forFeature([AIConfig]),

    // 静态文件服务配置
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          rootPath: configService.get<string>('PUBLIC_DIR_ABSOLUTE_PATH'),
          serveRoot: '/public',
        },
      ],
    }),

    // JWT模块配置
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),

    // 应用模块
    ControllersModule,
    WsGatewaysModule,
  ],
  providers: [
    AIConfigService,
  ],
})
export class AppModule { }