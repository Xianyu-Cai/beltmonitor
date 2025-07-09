"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.Camera = void 0;
var typeorm_1 = require("typeorm");
var alarm_event_entity_1 = require("../alarm-event/alarm-event.entity");
var alarm_rule_entity_1 = require("../alarm-rule/alarm-rule.entity");
var Camera = /** @class */ (function () {
    function Camera() {
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' })
    ], Camera.prototype, "id");
    __decorate([
        (0, typeorm_1.Column)()
    ], Camera.prototype, "name");
    __decorate([
        (0, typeorm_1.Column)({ type: 'bool', "default": false })
    ], Camera.prototype, "online");
    __decorate([
        (0, typeorm_1.Column)({ "default": '' })
    ], Camera.prototype, "rtspUrl");
    __decorate([
        (0, typeorm_1.Column)({ type: 'double' })
    ], Camera.prototype, "latitude");
    __decorate([
        (0, typeorm_1.Column)({ type: 'double' })
    ], Camera.prototype, "longitude");
    __decorate([
        (0, typeorm_1.Column)()
    ], Camera.prototype, "model");
    __decorate([
        (0, typeorm_1.CreateDateColumn)()
    ], Camera.prototype, "createdAt");
    __decorate([
        (0, typeorm_1.UpdateDateColumn)()
    ], Camera.prototype, "updatedAt");
    __decorate([
        (0, typeorm_1.DeleteDateColumn)()
    ], Camera.prototype, "deletedAt");
    __decorate([
        (0, typeorm_1.OneToMany)(function () { return alarm_event_entity_1.AlarmEvent; }, function (alarmEvent) { return alarmEvent.sourceCamera; }),
        (0, typeorm_1.JoinColumn)()
    ], Camera.prototype, "alarmEvents");
    __decorate([
        (0, typeorm_1.ManyToMany)(function () { return alarm_rule_entity_1.AlarmRule; }, function (alarmRule) { return alarmRule.relatedCameras; })
    ], Camera.prototype, "alarmRules");
    Camera = __decorate([
        (0, typeorm_1.Entity)()
    ], Camera);
    return Camera;
}());
exports.Camera = Camera;
