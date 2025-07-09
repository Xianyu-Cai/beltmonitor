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
exports.__esModule = true;
exports.AdminController = void 0;
var common_1 = require("@nestjs/common");
var auth_guard_1 = require("../../../../../../../src/guards/auth/auth.guard");
var role_guard_1 = require("../../../../../../../src/guards/role/role.guard");
var alarm_rule_entity_1 = require("../../../../../../../src/services/alarm-rule/alarm-rule.entity");
var camera_entity_1 = require("../../../../../../../src/services/camera/camera.entity");
var AdminController = /** @class */ (function () {
    function AdminController(mapConfigService, utilsService, cameraService, alarmRuleService, userService) {
        this.mapConfigService = mapConfigService;
        this.utilsService = utilsService;
        this.cameraService = cameraService;
        this.alarmRuleService = alarmRuleService;
        this.userService = userService;
    }
    AdminController.prototype.updateMapConfig = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(body.layer.type === 'imageOverlay' &&
                            body.layer.url.startsWith('data:image'))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.utilsService.writeBase64ImageToFile(body.layer.url)];
                    case 1:
                        filePath = _a.sent();
                        this.mapConfigService.updateConfig({
                            layerType: 'imageOverlay',
                            layerUrlOrPath: filePath,
                            imageLayerBounds: body.layer.bounds,
                            mapCenter: body.mapOptions.center,
                            mapZoom: body.mapOptions.zoom,
                            minZoom: body.mapOptions.minZoom,
                            maxZoom: body.mapOptions.maxZoom
                        });
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.mapConfigService.updateConfig({
                            layerType: 'tileLayer',
                            layerUrlOrPath: body.layer.url,
                            mapCenter: body.mapOptions.center,
                            mapZoom: body.mapOptions.zoom,
                            minZoom: body.mapOptions.minZoom,
                            maxZoom: body.mapOptions.maxZoom
                        })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.getCameraList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var list;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cameraService.getList(true, true)];
                    case 1:
                        list = _a.sent();
                        return [2 /*return*/, list.map(function (camera) {
                                var _a;
                                return ({
                                    cameraID: camera.id,
                                    cameraName: camera.name,
                                    cameraStatus: _this.cameraService.getCameraStatus(camera),
                                    latlng: [Number(camera.latitude), Number(camera.longitude)],
                                    cameraModel: camera.model,
                                    hlsUrl: _this.cameraService.getHlsUrl(camera.id),
                                    rtspUrl: camera.rtspUrl,
                                    alarmRules: ((_a = camera.alarmRules) === null || _a === void 0 ? void 0 : _a.map(function (rule) { return ({
                                        alarmRuleID: rule.id,
                                        alarmRuleName: rule.name
                                    }); })) || []
                                });
                            })];
                }
            });
        });
    };
    AdminController.prototype.addCamera = function (body) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.cameraService.addCamera({
                            name: body.cameraName,
                            model: body.cameraModel,
                            latitude: body.latlng[0],
                            longitude: body.latlng[1],
                            rtspUrl: body.rtspUrl,
                            alarmRules: ((_a = body.alarmRuleIDs) === null || _a === void 0 ? void 0 : _a.map(function (id) {
                                var rule = new alarm_rule_entity_1.AlarmRule();
                                rule.id = id;
                                return rule;
                            })) || []
                        })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.updateCamera = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cameraService.updateCamera({
                            id: body.cameraID,
                            name: body.cameraName,
                            model: body.cameraModel,
                            latitude: body.latlng[0],
                            longitude: body.latlng[1],
                            rtspUrl: body.rtspUrl,
                            alarmRules: body.alarmRuleIDs.map(function (id) {
                                var rule = new alarm_rule_entity_1.AlarmRule();
                                rule.id = id;
                                return rule;
                            })
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.deleteCamera = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cameraService.deleteCamera(body.cameraID)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.getAlarmRuleList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleService.getList(true)];
                    case 1:
                        list = _a.sent();
                        return [2 /*return*/, list.map(function (rule) {
                                var _a;
                                return ({
                                    alarmRuleID: rule.id,
                                    alarmRuleName: rule.name,
                                    enabled: rule.enabled,
                                    algorithmType: rule.algorithmType,
                                    relatedCameras: ((_a = rule.relatedCameras) === null || _a === void 0 ? void 0 : _a.map(function (camera) { return ({
                                        cameraID: camera.id,
                                        cameraName: camera.name
                                    }); })) || [],
                                    triggerCondition: {
                                        time: {
                                            dayOfWeek: rule.triggerDayOfWeek,
                                            timeRange: [rule.triggerTimeStart, rule.triggerTimeEnd]
                                        },
                                        count: {
                                            min: rule.triggerCountMin,
                                            max: rule.triggerCountMax
                                        }
                                    }
                                });
                            })];
                }
            });
        });
    };
    AdminController.prototype.addAlarmRule = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleService.addRule({
                            name: body.alarmRuleName,
                            enabled: body.enabled,
                            algorithmType: body.algorithmType,
                            relatedCameras: body.relatedCameraIds.map(function (id) {
                                var camera = new camera_entity_1.Camera();
                                camera.id = id;
                                return camera;
                            }),
                            triggerDayOfWeek: body.triggerCondition.time.dayOfWeek,
                            triggerTimeStart: body.triggerCondition.time.timeRange[0],
                            triggerTimeEnd: body.triggerCondition.time.timeRange[1],
                            triggerCountMin: body.triggerCondition.count.min,
                            triggerCountMax: body.triggerCondition.count.max
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.updateAlarmRule = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleService.updateRule({
                            id: body.alarmRuleID,
                            name: body.alarmRuleName,
                            enabled: body.enabled,
                            algorithmType: body.algorithmType,
                            relatedCameras: body.relatedCameraIds.map(function (id) {
                                var camera = new camera_entity_1.Camera();
                                camera.id = id;
                                return camera;
                            }),
                            triggerDayOfWeek: body.triggerCondition.time.dayOfWeek,
                            triggerTimeStart: body.triggerCondition.time.timeRange[0],
                            triggerTimeEnd: body.triggerCondition.time.timeRange[1],
                            triggerCountMin: body.triggerCondition.count.min,
                            triggerCountMax: body.triggerCondition.count.max
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.deleteAlarmRule = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmRuleService.deleteRule(body.alarmRuleID)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.getUserList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var list;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userService.getUserList()];
                    case 1:
                        list = _a.sent();
                        return [2 /*return*/, list.map(function (user) {
                                var _a, _b;
                                return ({
                                    username: user.username,
                                    avatarURL: user.avatarFilePath
                                        ? _this.utilsService.filePathToURL(user.avatarFilePath)
                                        : '',
                                    email: (_a = user.email) !== null && _a !== void 0 ? _a : '',
                                    tel: (_b = user.tel) !== null && _b !== void 0 ? _b : '',
                                    nickname: user.nickname,
                                    role: user.role
                                });
                            })];
                }
            });
        });
    };
    AdminController.prototype.addUser = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userService.addUser({
                            username: body.username,
                            password: body.password,
                            role: body.role,
                            nickname: body.nickname,
                            email: body.email,
                            tel: body.tel
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.updateUser = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userService.updateUser({
                            username: body.username,
                            password: body.newPassword,
                            role: body.role,
                            nickname: body.nickname,
                            email: body.email,
                            tel: body.tel
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    AdminController.prototype.deleteUser = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userService.deleteUser(body.username)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    __decorate([
        (0, common_1.Post)('/api/admin/updateMapConfig'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "updateMapConfig");
    __decorate([
        (0, common_1.Get)('/api/admin/getCameraList')
    ], AdminController.prototype, "getCameraList");
    __decorate([
        (0, common_1.Post)('/api/admin/addCamera'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "addCamera");
    __decorate([
        (0, common_1.Post)('/api/admin/updateCamera'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "updateCamera");
    __decorate([
        (0, common_1.Post)('/api/admin/deleteCamera'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "deleteCamera");
    __decorate([
        (0, common_1.Get)('/api/admin/getAlarmRuleList')
    ], AdminController.prototype, "getAlarmRuleList");
    __decorate([
        (0, common_1.Post)('/api/admin/addAlarmRule'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "addAlarmRule");
    __decorate([
        (0, common_1.Post)('/api/admin/updateAlarmRule'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "updateAlarmRule");
    __decorate([
        (0, common_1.Post)('/api/admin/deleteAlarmRule'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "deleteAlarmRule");
    __decorate([
        (0, common_1.Get)('/api/admin/getUserList')
    ], AdminController.prototype, "getUserList");
    __decorate([
        (0, common_1.Post)('/api/admin/addUser'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "addUser");
    __decorate([
        (0, common_1.Post)('/api/admin/updateUser'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "updateUser");
    __decorate([
        (0, common_1.Post)('/api/admin/deleteUser'),
        __param(0, (0, common_1.Body)())
    ], AdminController.prototype, "deleteUser");
    AdminController = __decorate([
        (0, common_1.Controller)(),
        (0, common_1.SetMetadata)('role', 'admin'),
        (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard)
    ], AdminController);
    return AdminController;
}());
exports.AdminController = AdminController;
