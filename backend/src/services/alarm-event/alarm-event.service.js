"use strict";
// backend/src/services/alarm-event/alarm-event.service.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.AlarmEventService = void 0;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("@nestjs/typeorm");
var typeorm_2 = require("typeorm");
var alarm_event_entity_1 = require("./alarm-event.entity");
var camera_entity_1 = require("../camera/camera.entity");
var alarm_rule_entity_1 = require("../alarm-rule/alarm-rule.entity");
var AlarmEventService = /** @class */ (function () {
    function AlarmEventService(
    // 注入 AlarmEvent 对应的仓库，用于数据库操作
    alarmEventRepo, 
    // 如果在 addEvent() 里需要先查摄像头，则注入 Camera 仓库
    cameraRepo, 
    // 若需要自动匹配 AlarmRule，则注入 AlarmRule 仓库
    alarmRuleRepo) {
        this.alarmEventRepo = alarmEventRepo;
        this.cameraRepo = cameraRepo;
        this.alarmRuleRepo = alarmRuleRepo;
    }
    /**
     * 获取报警事件列表，可分页、可筛选、可选择是否关联查询 Camera / AlarmRule。
     * @param withSourceCamera 是否联表查询 sourceCamera
     * @param withAlarmRule 是否联表查询 alarmRule
     * @param current 当前页码
     * @param pageSize 每页大小
     * @param search 查询条件
     */
    AlarmEventService.prototype.getList = function (withSourceCamera, withAlarmRule, current, pageSize, search) {
        if (withSourceCamera === void 0) { withSourceCamera = false; }
        if (withAlarmRule === void 0) { withAlarmRule = false; }
        return __awaiter(this, void 0, void 0, function () {
            var findOptions, total, list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        findOptions = {
                            relations: {
                                sourceCamera: withSourceCamera,
                                alarmRule: withAlarmRule
                            },
                            skip: current && pageSize ? (current - 1) * pageSize : undefined,
                            take: current && pageSize ? pageSize : undefined,
                            where: {
                                resolved: search === null || search === void 0 ? void 0 : search.resolved,
                                sourceCamera: {
                                    name: (search === null || search === void 0 ? void 0 : search.cameraName) ? (0, typeorm_2.Like)("%".concat(search.cameraName, "%")) : undefined,
                                    id: search === null || search === void 0 ? void 0 : search.cameraID
                                },
                                alarmRule: {
                                    name: (search === null || search === void 0 ? void 0 : search.alarmRuleName)
                                        ? (0, typeorm_2.Like)("%".concat(search.alarmRuleName, "%"))
                                        : undefined
                                }
                            },
                            order: {
                                id: 'DESC'
                            }
                        };
                        return [4 /*yield*/, this.alarmEventRepo.count(findOptions)];
                    case 1:
                        total = _a.sent();
                        return [4 /*yield*/, this.alarmEventRepo.find(findOptions)];
                    case 2:
                        list = _a.sent();
                        return [2 /*return*/, { total: total, list: list }];
                }
            });
        });
    };
    /**
     * 获取所有已处理的报警事件
     */
    AlarmEventService.prototype.getResolvedList = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmEventRepo.find({ where: { resolved: true } })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 获取所有未处理（pending）的报警事件
     */
    AlarmEventService.prototype.getPenddingList = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmEventRepo.find({ where: { resolved: false } })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 获取未处理报警事件的总数量
     */
    AlarmEventService.prototype.getPendingCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmEventRepo.count({ where: { resolved: false } })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 将指定 id 的报警事件标记为已处理
     * @param id 报警事件ID
     */
    AlarmEventService.prototype.resolve = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmEventRepo.findOne({ where: { id: id } })];
                    case 1:
                        event = _a.sent();
                        if (!event) {
                            throw new common_1.NotFoundException("AlarmEvent not found (ID: ".concat(id, ")"));
                        }
                        event.resolved = true;
                        return [4 /*yield*/, this.alarmEventRepo.save(event)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 新增一条报警事件。
     * - 必要字段：cameraID, picFilePath
     * - 可选字段：alarmRuleID, alarmType, confidence, resolved 等
     * - 调用方只需传简单字段，这里在 Service 内部查询并关联 Camera / AlarmRule
     */
    AlarmEventService.prototype.addEvent = function (eventData) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var camera, rule, newEvent;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.cameraRepo.findOne({
                            where: { id: eventData.cameraID }
                        })];
                    case 1:
                        camera = _b.sent();
                        if (!camera) {
                            throw new common_1.NotFoundException("Camera not found (ID: ".concat(eventData.cameraID, ")"));
                        }
                        rule = null;
                        if (!eventData.alarmRuleID) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.alarmRuleRepo.findOne({
                                where: { id: eventData.alarmRuleID }
                            })];
                    case 2:
                        rule = _b.sent();
                        if (!rule) {
                            throw new common_1.NotFoundException("AlarmRule not found (ID: ".concat(eventData.alarmRuleID, ")"));
                        }
                        _b.label = 3;
                    case 3:
                        newEvent = this.alarmEventRepo.create({
                            alarmType: eventData.alarmType,
                            confidence: eventData.confidence,
                            picFilePath: eventData.picFilePath,
                            resolved: (_a = eventData.resolved) !== null && _a !== void 0 ? _a : false,
                            sourceCamera: camera,
                            alarmRule: rule || undefined
                        });
                        return [4 /*yield*/, this.alarmEventRepo.save(newEvent)];
                    case 4: 
                    // 4. 保存入库
                    return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    AlarmEventService = __decorate([
        (0, common_1.Injectable)(),
        __param(0, (0, typeorm_1.InjectRepository)(alarm_event_entity_1.AlarmEvent)),
        __param(1, (0, typeorm_1.InjectRepository)(camera_entity_1.Camera)),
        __param(2, (0, typeorm_1.InjectRepository)(alarm_rule_entity_1.AlarmRule))
    ], AlarmEventService);
    return AlarmEventService;
}());
exports.AlarmEventService = AlarmEventService;
