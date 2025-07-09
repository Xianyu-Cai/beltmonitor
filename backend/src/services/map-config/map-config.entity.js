"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.MapConfig = void 0;
var typeorm_1 = require("typeorm");
var MapConfig = /** @class */ (function () {
    function MapConfig() {
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' })
    ], MapConfig.prototype, "id");
    __decorate([
        (0, typeorm_1.Column)()
    ], MapConfig.prototype, "layerType");
    __decorate([
        (0, typeorm_1.Column)()
    ], MapConfig.prototype, "layerUrlOrPath");
    __decorate([
        (0, typeorm_1.Column)({
            type: 'json',
            nullable: true
        })
    ], MapConfig.prototype, "imageLayerBounds");
    __decorate([
        (0, typeorm_1.Column)({ type: 'json' })
    ], MapConfig.prototype, "mapCenter");
    __decorate([
        (0, typeorm_1.Column)({ type: 'int' })
    ], MapConfig.prototype, "mapZoom");
    __decorate([
        (0, typeorm_1.Column)({ type: 'int', "default": 0 })
    ], MapConfig.prototype, "minZoom");
    __decorate([
        (0, typeorm_1.Column)({ type: 'int', "default": 18 })
    ], MapConfig.prototype, "maxZoom");
    __decorate([
        (0, typeorm_1.CreateDateColumn)()
    ], MapConfig.prototype, "createdAt");
    __decorate([
        (0, typeorm_1.DeleteDateColumn)()
    ], MapConfig.prototype, "deletedAt");
    MapConfig = __decorate([
        (0, typeorm_1.Entity)()
    ], MapConfig);
    return MapConfig;
}());
exports.MapConfig = MapConfig;
