"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AlarmRule = void 0;
var typeorm_1 = require("typeorm");
var camera_entity_1 = require("../camera/camera.entity");
var alarm_event_entity_1 = require("../alarm-event/alarm-event.entity");
/**
 * AlarmRule 实体类，用于定义和存储系统中报警规则的详细信息。
 */
var AlarmRule = /** @class */ (function () {
    function AlarmRule() {
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' })
    ], AlarmRule.prototype, "id");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmRule.prototype, "name");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmRule.prototype, "enabled");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmRule.prototype, "algorithmType");
    __decorate([
        (0, typeorm_1.Column)({ type: 'json' })
    ], AlarmRule.prototype, "triggerDayOfWeek");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmRule.prototype, "triggerTimeStart");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmRule.prototype, "triggerTimeEnd");
    __decorate([
        (0, typeorm_1.Column)({ type: 'int' })
    ], AlarmRule.prototype, "triggerCountMin");
    __decorate([
        (0, typeorm_1.Column)({ type: 'int' })
    ], AlarmRule.prototype, "triggerCountMax");
    __decorate([
        (0, typeorm_1.CreateDateColumn)()
    ], AlarmRule.prototype, "createdAt");
    __decorate([
        (0, typeorm_1.UpdateDateColumn)()
    ], AlarmRule.prototype, "updatedAt");
    __decorate([
        (0, typeorm_1.DeleteDateColumn)()
    ], AlarmRule.prototype, "deletedAt");
    __decorate([
        (0, typeorm_1.ManyToMany)(function () { return camera_entity_1.Camera; }, function (camera) { return camera.alarmRules; }),
        (0, typeorm_1.JoinTable)()
    ], AlarmRule.prototype, "relatedCameras");
    __decorate([
        (0, typeorm_1.OneToMany)(function () { return alarm_event_entity_1.AlarmEvent; }, function (alarmEvent) { return alarmEvent.alarmRule; })
    ], AlarmRule.prototype, "alarmEvents");
    AlarmRule = __decorate([
        (0, typeorm_1.Entity)()
    ], AlarmRule);
    return AlarmRule;
}());
exports.AlarmRule = AlarmRule;
