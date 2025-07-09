"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.AlarmRuleService = void 0;
var common_1 = require("@nestjs/common");
var alarm_rule_entity_1 = require("./alarm-rule.entity");
var typeorm_1 = require("@nestjs/typeorm");
var ai_end_gateway_1 = require("../../../../../../../src/ws-gateways/ai-end/ai-end.gateway");
/**
 * AlarmRuleService 用于管理系统中的报警规则（AlarmRule）：
 *  - 提供对报警规则的增、删、改、查功能；
 *  - 在规则发生变动时，通过 AiEndGateway 通知相关的摄像头进行配置更新。
 */
var AlarmRuleService = /** @class */ (function () {
    /**
     * 通过注入 AlarmRule 实体对应的 Repository 来进行数据库操作。
     * 同时使用 forwardRef 注入 AiEndGateway，以便在报警规则发生变动时，通知摄像头配置变更。
     */
    function AlarmRuleService(alarmRuleRepo, aiEndGateway) {
        this.alarmRuleRepo = alarmRuleRepo;
        this.aiEndGateway = aiEndGateway;
    }
    /**
     * 获取所有报警规则的列表，可根据参数选择是否一并查询关联的摄像头和报警事件信息。
     * @param {boolean} [withRelatedCameras=false] 是否联表查询 relatedCameras
     * @param {boolean} [withAlarmEvents=false] 是否联表查询 alarmEvents
     * @returns {Promise<AlarmRule[]>} 返回符合查询条件的报警规则列表
     */
    AlarmRuleService.prototype.getList = function (withRelatedCameras, withAlarmEvents) {
        if (withRelatedCameras === void 0) { withRelatedCameras = false; }
        if (withAlarmEvents === void 0) { withAlarmEvents = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleRepo.find({
                            relations: {
                                relatedCameras: withRelatedCameras,
                                alarmEvents: withAlarmEvents
                            }
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 根据 ruleID 获取单个报警规则的信息，可选择是否联表查询关联的摄像头和报警事件信息。
     * @param {number} ruleID 报警规则的唯一 ID
     * @param {boolean} [withRelatedCameras=false] 是否联表查询 relatedCameras
     * @param {boolean} [withAlarmEvents=false] 是否联表查询 alarmEvents
     * @returns {Promise<AlarmRule | null>} 返回查询到的报警规则，若不存在则返回 null
     */
    AlarmRuleService.prototype.getById = function (ruleID, withRelatedCameras, withAlarmEvents) {
        if (withRelatedCameras === void 0) { withRelatedCameras = false; }
        if (withAlarmEvents === void 0) { withAlarmEvents = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleRepo.findOne({
                            where: { id: ruleID },
                            relations: {
                                relatedCameras: withRelatedCameras,
                                alarmEvents: withAlarmEvents
                            }
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 新增一条报警规则，并通知相关的摄像头进行配置更新。
     * @param {Partial<AlarmRule>} rule 需要添加的报警规则对象(部分字段即可)
     * @returns {Promise<void>} 无返回值
     */
    AlarmRuleService.prototype.addRule = function (rule) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var savedRule;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleRepo.save(rule)];
                    case 1:
                        savedRule = _c.sent();
                        // 如果该规则关联了摄像头，则通知每个摄像头进行配置更新
                        return [4 /*yield*/, Promise.all((_b = (_a = savedRule.relatedCameras) === null || _a === void 0 ? void 0 : _a.map(function (camera) {
                                return _this.aiEndGateway.notifyCameraConfigChange(camera.id);
                            })) !== null && _b !== void 0 ? _b : [])];
                    case 2:
                        // 如果该规则关联了摄像头，则通知每个摄像头进行配置更新
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 更新已存在的报警规则信息，并通知相关摄像头进行配置更新。
     * @param {Partial<AlarmRule>} rule 需要更新的报警规则对象，必须包含有效的 rule.id
     * @returns {Promise<void>} 无返回值
     */
    AlarmRuleService.prototype.updateRule = function (rule) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var originalRule, savedRule, relatedCameraIds;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // 若未提供 ID，无法进行更新
                        if (!rule.id)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.getById(rule.id, true)];
                    case 1:
                        originalRule = _c.sent();
                        return [4 /*yield*/, this.alarmRuleRepo.save(rule)];
                    case 2:
                        savedRule = _c.sent();
                        relatedCameraIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], ((_a = originalRule === null || originalRule === void 0 ? void 0 : originalRule.relatedCameras) !== null && _a !== void 0 ? _a : []), true), ((_b = savedRule === null || savedRule === void 0 ? void 0 : savedRule.relatedCameras) !== null && _b !== void 0 ? _b : []), true).map(function (camera) { return camera.id; })), true);
                        // 通知所有受影响的摄像头进行配置更新
                        return [4 /*yield*/, Promise.all(relatedCameraIds.map(function (cameraId) {
                                return _this.aiEndGateway.notifyCameraConfigChange(cameraId);
                            }))];
                    case 3:
                        // 通知所有受影响的摄像头进行配置更新
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 根据 ruleID 软删除（标记删除）指定的报警规则，并通知相关摄像头进行配置更新。
     * @param {number} ruleID 需要删除的报警规则 ID
     * @returns {Promise<void>} 无返回值
     */
    AlarmRuleService.prototype.deleteRule = function (ruleID) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var rule;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getById(ruleID, true)];
                    case 1:
                        rule = _c.sent();
                        if (!rule)
                            return [2 /*return*/];
                        // 执行软删除操作
                        return [4 /*yield*/, this.alarmRuleRepo.softDelete({ id: ruleID })];
                    case 2:
                        // 执行软删除操作
                        _c.sent();
                        // 通知所有受影响的摄像头进行配置更新
                        return [4 /*yield*/, Promise.all((_b = (_a = rule.relatedCameras) === null || _a === void 0 ? void 0 : _a.map(function (camera) {
                                return _this.aiEndGateway.notifyCameraConfigChange(camera.id);
                            })) !== null && _b !== void 0 ? _b : [])];
                    case 3:
                        // 通知所有受影响的摄像头进行配置更新
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AlarmRuleService = __decorate([
        (0, common_1.Injectable)(),
        __param(0, (0, typeorm_1.InjectRepository)(alarm_rule_entity_1.AlarmRule)),
        __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(function () { return ai_end_gateway_1.AiEndGateway; })))
    ], AlarmRuleService);
    return AlarmRuleService;
}());
exports.AlarmRuleService = AlarmRuleService;
