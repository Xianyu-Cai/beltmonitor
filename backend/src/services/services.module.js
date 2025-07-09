"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ServicesModule = void 0;
var common_1 = require("@nestjs/common");
var user_service_1 = require("./user/user.service");
var typeorm_1 = require("@nestjs/typeorm");
var user_entity_1 = require("./user/user.entity");
var camera_entity_1 = require("./camera/camera.entity");
var alarm_event_entity_1 = require("./alarm-event/alarm-event.entity");
var alarm_rule_entity_1 = require("./alarm-rule/alarm-rule.entity");
var camera_service_1 = require("./camera/camera.service");
var alarm_event_service_1 = require("./alarm-event/alarm-event.service");
var alarm_rule_service_1 = require("./alarm-rule/alarm-rule.service");
var utils_service_1 = require("./utils/utils.service");
var map_config_service_1 = require("./map-config/map-config.service");
var map_config_entity_1 = require("./map-config/map-config.entity");
var entities = [
    user_entity_1.User,
    camera_entity_1.Camera,
    alarm_event_entity_1.AlarmEvent,
    alarm_rule_entity_1.AlarmRule,
    map_config_entity_1.MapConfig,
];
var services = [
    user_service_1.UserService,
    camera_service_1.CameraService,
    alarm_event_service_1.AlarmEventService,
    alarm_rule_service_1.AlarmRuleService,
    utils_service_1.UtilsService,
    map_config_service_1.MapConfigService,
];
var ServicesModule = /** @class */ (function () {
    function ServicesModule() {
    }
    ServicesModule = __decorate([
        (0, common_1.Module)({
            imports: [typeorm_1.TypeOrmModule.forFeature(entities)],
            providers: services,
            exports: services
        })
    ], ServicesModule);
    return ServicesModule;
}());
exports.ServicesModule = ServicesModule;
