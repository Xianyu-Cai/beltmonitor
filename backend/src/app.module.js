"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("@nestjs/typeorm");
var config_1 = require("@nestjs/config");
var controllers_module_1 = require("./controllers/controllers.module");
var jwt_1 = require("@nestjs/jwt");
var serve_static_1 = require("@nestjs/serve-static");
var ws_gateways_module_1 = require("./ws-gateways/ws-gateways.module");
var cache_manager_1 = require("@nestjs/cache-manager");
var upload_module_1 = require("./uploads/upload.module"); // 正确引入 UploadModule
var path_1 = require("path"); // 确保引入了 path 模块
var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        (0, common_1.Module)({
            imports: [
                // 全局配置模块
                config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: 'server.config.env' }),
                // TypeORM 配置
                typeorm_1.TypeOrmModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: function (configService) { return ({
                        type: 'mysql',
                        host: configService.get('MYSQL_HOST'),
                        port: parseInt(configService.get('MYSQL_PORT') || '3306', 10),
                        username: configService.get('MYSQL_USER'),
                        password: configService.get('MYSQL_PASSWORD'),
                        database: configService.get('MYSQL_DATABASE'),
                        entities: [(0, path_1.join)(__dirname, '**', '*.entity.{ts,js}')],
                        synchronize: true,
                        dropSchema: false,
                        timezone: 'Z',
                        logging: true
                    }); }
                }),
                // 缓存模块
                cache_manager_1.CacheModule.register({ isGlobal: true, ttl: 0, max: 0 }),
                // 静态资源服务
                serve_static_1.ServeStaticModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: function (configService) { return [
                        {
                            rootPath: configService.get('PUBLIC_DIR_ABSOLUTE_PATH'),
                            serveRoot: '/public'
                        },
                    ]; }
                }),
                // JWT 配置
                jwt_1.JwtModule.registerAsync({
                    global: true,
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: function (configService) { return ({
                        secret: configService.get('JWT_SECRET'),
                        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') }
                    }); }
                }),
                // 其他模块
                controllers_module_1.ControllersModule,
                ws_gateways_module_1.WsGatewaysModule,
                upload_module_1.UploadModule, // 添加 UploadModule
            ]
        })
    ], AppModule);
    return AppModule;
}());
exports.AppModule = AppModule;
