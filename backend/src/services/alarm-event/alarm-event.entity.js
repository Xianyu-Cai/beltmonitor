"use strict";
// backend/src/services/alarm-event/alarm-event.entity.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AlarmEvent = void 0;
var typeorm_1 = require("typeorm");
var camera_entity_1 = require("../camera/camera.entity");
var alarm_rule_entity_1 = require("../alarm-rule/alarm-rule.entity");
var AlarmEvent = /** @class */ (function () {
    function AlarmEvent() {
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' })
    ], AlarmEvent.prototype, "id");
    __decorate([
        (0, typeorm_1.Column)({ type: 'bool', "default": false })
    ], AlarmEvent.prototype, "resolved");
    __decorate([
        (0, typeorm_1.Column)()
    ], AlarmEvent.prototype, "picFilePath");
    __decorate([
        (0, typeorm_1.Column)({ nullable: true })
    ], AlarmEvent.prototype, "alarmType");
    __decorate([
        (0, typeorm_1.Column)({ type: 'float', nullable: true })
    ], AlarmEvent.prototype, "confidence");
    __decorate([
        (0, typeorm_1.CreateDateColumn)()
    ], AlarmEvent.prototype, "createdAt");
    __decorate([
        (0, typeorm_1.UpdateDateColumn)()
    ], AlarmEvent.prototype, "updatedAt");
    __decorate([
        (0, typeorm_1.DeleteDateColumn)()
    ], AlarmEvent.prototype, "deletedAt");
    __decorate([
        (0, typeorm_1.ManyToOne)(function () { return camera_entity_1.Camera; }, function (camera) { return camera.alarmEvents; })
    ], AlarmEvent.prototype, "sourceCamera");
    __decorate([
        (0, typeorm_1.ManyToOne)(function () { return alarm_rule_entity_1.AlarmRule; }, function (alarmRule) { return alarmRule.alarmEvents; }),
        (0, typeorm_1.JoinColumn)()
    ], AlarmEvent.prototype, "alarmRule");
    AlarmEvent = __decorate([
        (0, typeorm_1.Entity)()
    ], AlarmEvent);
    return AlarmEvent;
}());
exports.AlarmEvent = AlarmEvent;
