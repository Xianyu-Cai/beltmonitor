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
exports.UserController = void 0;
var common_1 = require("@nestjs/common");
var dayjs_1 = require("dayjs");
var userinfo_decorator_1 = require("../../../../../../../src/decorators/userinfo/userinfo.decorator");
var auth_guard_1 = require("../../../../../../../src/guards/auth/auth.guard");
var role_guard_1 = require("../../../../../../../src/guards/role/role.guard");
var UserController = /** @class */ (function () {
    function UserController(cameraService, alarmEventService, userService, utilsService, mapConfigService) {
        this.cameraService = cameraService;
        this.alarmEventService = alarmEventService;
        this.userService = userService;
        this.utilsService = utilsService;
        this.mapConfigService = mapConfigService;
    }
    UserController.prototype.getBeltState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cameraList, cameraOnline, cameraAlarm, cameraListRes;
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.cameraService.getList(false, true)];
                    case 1:
                        cameraList = _b.sent();
                        cameraOnline = 0, cameraAlarm = 0;
                        cameraListRes = cameraList.map(function (camera) {
                            if (camera.online)
                                cameraOnline++;
                            if (_this.cameraService.getCameraStatus(camera) === 'alarm')
                                cameraAlarm++;
                            return {
                                cameraName: camera.name,
                                cameraID: camera.id,
                                cameraStatus: _this.cameraService.getCameraStatus(camera),
                                latlng: [Number(camera.latitude), Number(camera.longitude)]
                            };
                        });
                        _a = {
                            cameraTotal: cameraList.length,
                            cameraOnline: cameraOnline,
                            cameraAlarm: cameraAlarm
                        };
                        return [4 /*yield*/, this.alarmEventService.getPendingCount()];
                    case 2: return [2 /*return*/, (_a.alarmEventPending = _b.sent(),
                            _a.cameraList = cameraListRes,
                            _a)];
                }
            });
        });
    };
    UserController.prototype.getCameraInfo = function (cameraID) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var camera;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.cameraService.getById(cameraID, true, true)];
                    case 1:
                        camera = _e.sent();
                        if (!camera)
                            throw new common_1.NotFoundException('Camera not found');
                        return [2 /*return*/, {
                                cameraName: camera.name,
                                cameraID: camera.id,
                                cameraStatus: this.cameraService.getCameraStatus(camera),
                                hlsUrl: this.cameraService.getHlsUrl(camera.id),
                                latlng: [Number(camera.latitude), Number(camera.longitude)],
                                cameraModel: camera.model,
                                alarmRules: (_b = (_a = camera.alarmRules) === null || _a === void 0 ? void 0 : _a.map(function (rule) { return ({
                                    alarmRuleID: rule.id,
                                    alarmRuleName: rule.name
                                }); })) !== null && _b !== void 0 ? _b : [],
                                alarmEvents: (_d = (_c = camera.alarmEvents) === null || _c === void 0 ? void 0 : _c.map(function (event) {
                                    var _a, _b, _c, _d;
                                    return ({
                                        eventID: event.id,
                                        alarmTime: (0, dayjs_1["default"])(event.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                                        alarmRule: {
                                            alarmRuleID: (_b = (_a = event === null || event === void 0 ? void 0 : event.alarmRule) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0,
                                            alarmRuleName: (_d = (_c = event === null || event === void 0 ? void 0 : event.alarmRule) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : ''
                                        },
                                        resolved: event.resolved
                                    });
                                })) !== null && _d !== void 0 ? _d : []
                            }];
                }
            });
        });
    };
    UserController.prototype.resolveAlarm = function (eventID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.alarmEventService.resolve(eventID)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    UserController.prototype.getAlarmEvents = function (query) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var res;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.alarmEventService.getList(true, true, query.current, query.pageSize, {
                            resolved: query.resolved === 'true'
                                ? true
                                : query.resolved === 'false'
                                    ? false
                                    : undefined,
                            cameraID: query.cameraID,
                            alarmRuleName: query.alarmType,
                            cameraName: query.cameraName
                        })];
                    case 1:
                        res = _b.sent();
                        return [2 /*return*/, {
                                list: (_a = res.list.map(function (event) {
                                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                                    return ({
                                        eventID: event.id,
                                        alarmTime: (0, dayjs_1["default"])(event.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                                        alarmRule: {
                                            alarmRuleID: (_b = (_a = event === null || event === void 0 ? void 0 : event.alarmRule) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0,
                                            alarmRuleName: (_d = (_c = event === null || event === void 0 ? void 0 : event.alarmRule) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : ''
                                        },
                                        resolved: event.resolved,
                                        cameraID: (_f = (_e = event === null || event === void 0 ? void 0 : event.sourceCamera) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : 0,
                                        cameraName: (_h = (_g = event === null || event === void 0 ? void 0 : event.sourceCamera) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : '',
                                        cameraLatlng: [
                                            Number((_j = event === null || event === void 0 ? void 0 : event.sourceCamera) === null || _j === void 0 ? void 0 : _j.latitude),
                                            Number((_k = event === null || event === void 0 ? void 0 : event.sourceCamera) === null || _k === void 0 ? void 0 : _k.longitude),
                                        ],
                                        cameraModel: (_m = (_l = event === null || event === void 0 ? void 0 : event.sourceCamera) === null || _l === void 0 ? void 0 : _l.model) !== null && _m !== void 0 ? _m : '',
                                        alarmPicUrl: _this.utilsService.filePathToURL(event.picFilePath)
                                    });
                                })) !== null && _a !== void 0 ? _a : [],
                                total: res.total
                            }];
                }
            });
        });
    };
    UserController.prototype.getMonitList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cameraService.getList(false, true)];
                    case 1: return [2 /*return*/, (_a.sent()).map(function (camera) { return ({
                            cameraID: camera.id,
                            cameraName: camera.name,
                            cameraStatus: _this.cameraService.getCameraStatus(camera),
                            hlsUrl: _this.cameraService.getHlsUrl(camera.id)
                        }); })];
                }
            });
        });
    };
    UserController.prototype.getUserInfo = function (username) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var userInfo;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.userService.getByUsername(username)];
                    case 1:
                        userInfo = _c.sent();
                        if (!userInfo)
                            throw new common_1.NotFoundException('User not found');
                        return [2 /*return*/, {
                                username: userInfo.username,
                                nickname: userInfo.nickname,
                                email: (_a = userInfo.email) !== null && _a !== void 0 ? _a : '',
                                tel: (_b = userInfo.tel) !== null && _b !== void 0 ? _b : '',
                                role: userInfo.role,
                                avatarURL: userInfo.avatarFilePath
                                    ? this.utilsService.filePathToURL(userInfo.avatarFilePath)
                                    : ''
                            }];
                }
            });
        });
    };
    UserController.prototype.updateUserInfo = function (body, username) {
        return __awaiter(this, void 0, void 0, function () {
            var avatarFilePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (username !== body.username || body.password) {
                            throw new common_1.ForbiddenException('Permission denied');
                        }
                        if (!body.avatarURL.startsWith('data:image')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.utilsService.writeBase64ImageToFile(body.avatarURL)];
                    case 1:
                        avatarFilePath = _a.sent();
                        return [4 /*yield*/, this.userService.updateUser({
                                username: username,
                                nickname: body.nickname,
                                email: body.email,
                                tel: body.tel,
                                avatarFilePath: avatarFilePath
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.userService.updateUser({
                            username: username,
                            nickname: body.nickname,
                            email: body.email,
                            tel: body.tel
                        })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, {}];
                }
            });
        });
    };
    UserController.prototype.updatePassword = function (body, username) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userService.getByUsername(username)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            throw new common_1.NotFoundException('User not found');
                        if (body.oldPassword !== user.password) {
                            throw new common_1.PreconditionFailedException('旧密码不正确');
                        }
                        return [4 /*yield*/, this.userService.updateUser({
                                username: username,
                                password: body.newPassword
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    UserController.prototype.getMapConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mapConfigService.getLatestConfig()];
                    case 1:
                        config = _a.sent();
                        if (!config)
                            throw new common_1.NotFoundException('Map config not found');
                        return [2 /*return*/, {
                                layer: config.layerType === 'imageOverlay'
                                    ? {
                                        type: 'imageOverlay',
                                        url: this.utilsService.filePathToURL(config.layerUrlOrPath),
                                        bounds: config.imageLayerBounds
                                    }
                                    : {
                                        type: 'tileLayer',
                                        url: config.layerUrlOrPath
                                    },
                                mapOptions: {
                                    center: config.mapCenter,
                                    zoom: config.mapZoom,
                                    minZoom: config.minZoom,
                                    maxZoom: config.maxZoom,
                                    attributionControl: false,
                                    zoomControl: false
                                }
                            }];
                }
            });
        });
    };
    // === 新增: 报警事件上报接口 ===
    UserController.prototype.addAlarmEvent = function (body) {
        return __awaiter(this, void 0, void 0, function () {
            var cameraID, alarmType, picFilePath, confidence, newEvent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cameraID = body.cameraID, alarmType = body.alarmType, picFilePath = body.picFilePath, confidence = body.confidence;
                        return [4 /*yield*/, this.alarmEventService.addEvent({
                                cameraID: cameraID,
                                alarmType: alarmType,
                                picFilePath: picFilePath,
                                confidence: confidence,
                                resolved: false
                            })];
                    case 1:
                        newEvent = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: '报警事件已成功写入数据库',
                                data: {
                                    eventID: newEvent.id
                                }
                            }];
                }
            });
        });
    };
    __decorate([
        (0, common_1.Get)('/api/user/getBeltState')
    ], UserController.prototype, "getBeltState");
    __decorate([
        (0, common_1.Get)('/api/user/getCameraInfo'),
        __param(0, (0, common_1.Query)('cameraID'))
    ], UserController.prototype, "getCameraInfo");
    __decorate([
        (0, common_1.Post)('/api/user/resolveAlarm'),
        __param(0, (0, common_1.Body)('eventID'))
    ], UserController.prototype, "resolveAlarm");
    __decorate([
        (0, common_1.Get)('/api/user/getAlarmEvents'),
        __param(0, (0, common_1.Query)())
    ], UserController.prototype, "getAlarmEvents");
    __decorate([
        (0, common_1.Get)('/api/user/getMonitList')
    ], UserController.prototype, "getMonitList");
    __decorate([
        (0, common_1.Get)('/api/user/getUserInfo'),
        __param(0, (0, userinfo_decorator_1.UserInfo)('username'))
    ], UserController.prototype, "getUserInfo");
    __decorate([
        (0, common_1.Post)('/api/user/updateUserInfo'),
        __param(0, (0, common_1.Body)()),
        __param(1, (0, userinfo_decorator_1.UserInfo)('username'))
    ], UserController.prototype, "updateUserInfo");
    __decorate([
        (0, common_1.Post)('/api/user/updatePassword'),
        __param(0, (0, common_1.Body)()),
        __param(1, (0, userinfo_decorator_1.UserInfo)('username'))
    ], UserController.prototype, "updatePassword");
    __decorate([
        (0, common_1.Get)('/api/user/getMapConfig')
    ], UserController.prototype, "getMapConfig");
    __decorate([
        (0, common_1.Post)('/api/user/addAlarmEvent'),
        __param(0, (0, common_1.Body)())
    ], UserController.prototype, "addAlarmEvent");
    UserController = __decorate([
        (0, common_1.Controller)(),
        (0, common_1.SetMetadata)('role', 'user'),
        (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard)
    ], UserController);
    return UserController;
}());
exports.UserController = UserController;
