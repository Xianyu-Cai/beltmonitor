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
exports.AiEndGateway = void 0;
var common_1 = require("@nestjs/common");
var websockets_1 = require("@nestjs/websockets");
var alarm_event_service_1 = require("../../../../../../../src/services/alarm-event/alarm-event.service");
var camera_service_1 = require("../../../../../../../src/services/camera/camera.service");
var user_service_1 = require("../../../../../../../src/services/user/user.service");
var utils_service_1 = require("../../../../../../../src/services/utils/utils.service");
var AiEndGateway = /** @class */ (function () {
    function AiEndGateway(cameraService, alarmEventService, userService, utilsService) {
        this.cameraService = cameraService;
        this.alarmEventService = alarmEventService;
        this.userService = userService;
        this.utilsService = utilsService;
        // 保存已连接客户端，key 为 cameraID（字符串），value 为 Socket 实例
        this.connecetedClients = new Map();
    }
    /**
     * 测试用消息，客户端发送 "message" 时的回调
     */
    AiEndGateway.prototype.handleMessage = function (body, client) {
        console.log('message received:', body);
        client.emit('message', 'hello from server');
    };
    /**
     * 当 AI 端发送 "alarm" 消息时，表示检测到了报警事件
     */
    AiEndGateway.prototype.handleAlarm = function (body, client) {
        return __awaiter(this, void 0, void 0, function () {
            var cameraID, parsedCameraID, picFilePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('alarm received:', body);
                        cameraID = client.data.cameraID;
                        parsedCameraID = parseInt(cameraID, 10);
                        return [4 /*yield*/, this.utilsService.writeBase64ImageToFile(body.picBase64)];
                    case 1:
                        picFilePath = _a.sent();
                        // 3. 调用 alarmEventService，新增报警事件
                        //    只传 cameraID, alarmRuleID, picFilePath(及其他可能的字段)，
                        //    由 Service 内部自动查询并关联 Camera, AlarmRule
                        return [4 /*yield*/, this.alarmEventService.addEvent({
                                cameraID: parsedCameraID,
                                alarmRuleID: body.alarmRuleID,
                                picFilePath: picFilePath
                            })];
                    case 2:
                        // 3. 调用 alarmEventService，新增报警事件
                        //    只传 cameraID, alarmRuleID, picFilePath(及其他可能的字段)，
                        //    由 Service 内部自动查询并关联 Camera, AlarmRule
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 主动通知 AI 端（cameraID 对应的 socket）更新配置信息
     */
    AiEndGateway.prototype.notifyCameraConfigChange = function (cameraID, cameraConfig) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var client, config;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        client = this.connecetedClients.get(cameraID.toString());
                        if (!client)
                            return [2 /*return*/];
                        if (!!cameraConfig) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.cameraService.getById(cameraID, true)];
                    case 1:
                        config = _b.sent();
                        if (!config)
                            return [2 /*return*/];
                        cameraConfig = {
                            alarmRules: (_a = config.alarmRules) !== null && _a !== void 0 ? _a : [],
                            rtspUrl: config.rtspUrl
                        };
                        _b.label = 2;
                    case 2:
                        client.emit('cameraConfigChange', cameraConfig);
                        console.log("notifyCameraConfigChange: cameraID=".concat(cameraID));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 主动断开某个 cameraID 的 socket 连接
     */
    AiEndGateway.prototype.disconnectClient = function (cameraID) {
        return __awaiter(this, void 0, void 0, function () {
            var client;
            return __generator(this, function (_a) {
                client = this.connecetedClients.get(cameraID.toString());
                client === null || client === void 0 ? void 0 : client.disconnect();
                return [2 /*return*/];
            });
        });
    };
    /**
     * 有新客户端连接时触发
     */
    AiEndGateway.prototype.handleConnection = function (client) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data, user, camera, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        // 1. 解析自定义头 data (JSON 字符串)
                        if (typeof client.client.request.headers.data !== 'string') {
                            client.disconnect();
                            return [2 /*return*/];
                        }
                        data = JSON.parse(client.client.request.headers.data);
                        return [4 /*yield*/, this.userService.authLogin(data.username, data.password)];
                    case 1:
                        user = _b.sent();
                        if ((user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
                            client.disconnect();
                            return [2 /*return*/];
                        }
                        if (!this.connecetedClients.has(data.cameraID)) return [3 /*break*/, 3];
                        (_a = this.connecetedClients.get(data.cameraID)) === null || _a === void 0 ? void 0 : _a.disconnect();
                        this.connecetedClients["delete"](data.cameraID);
                        return [4 /*yield*/, sleep(1000)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [4 /*yield*/, this.cameraService.getById(parseInt(data.cameraID, 10), false, true)];
                    case 4:
                        camera = _b.sent();
                        if (!camera) {
                            client.disconnect();
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.cameraService.updateCamera({
                                id: parseInt(data.cameraID, 10),
                                online: true
                            })];
                    case 5:
                        _b.sent();
                        // 5. 记录连接到 connecetedClients
                        client.data = data;
                        this.connecetedClients.set(data.cameraID, client);
                        console.log("client cameraID=".concat(data.cameraID, " connected"));
                        // 6. 通知 camera 更新配置信息
                        return [4 /*yield*/, this.notifyCameraConfigChange(parseInt(data.cameraID, 10))];
                    case 6:
                        // 6. 通知 camera 更新配置信息
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _b.sent();
                        console.error('handleConnection error:', err_1);
                        client.disconnect();
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 当客户端断开连接时触发
     */
    AiEndGateway.prototype.handleDisconnect = function (client) {
        return __awaiter(this, void 0, void 0, function () {
            var data, cameraIDNum;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.connecetedClients["delete"](client.data.cameraID);
                        client.removeAllListeners();
                        data = client.data;
                        cameraIDNum = parseInt(data.cameraID, 10);
                        // 更新摄像头在线状态
                        return [4 /*yield*/, this.cameraService.updateCamera({ id: cameraIDNum, online: false })];
                    case 1:
                        // 更新摄像头在线状态
                        _a.sent();
                        console.log("client cameraID=".concat(data.cameraID, " disconnected"));
                        return [2 /*return*/];
                }
            });
        });
    };
    __decorate([
        (0, websockets_1.WebSocketServer)()
    ], AiEndGateway.prototype, "wsServer");
    __decorate([
        (0, websockets_1.SubscribeMessage)('message'),
        __param(0, (0, websockets_1.MessageBody)()),
        __param(1, (0, websockets_1.ConnectedSocket)())
    ], AiEndGateway.prototype, "handleMessage");
    __decorate([
        (0, websockets_1.SubscribeMessage)('alarm'),
        __param(0, (0, websockets_1.MessageBody)()),
        __param(1, (0, websockets_1.ConnectedSocket)())
    ], AiEndGateway.prototype, "handleAlarm");
    __decorate([
        __param(0, (0, websockets_1.ConnectedSocket)())
    ], AiEndGateway.prototype, "handleConnection");
    __decorate([
        __param(0, (0, websockets_1.ConnectedSocket)())
    ], AiEndGateway.prototype, "handleDisconnect");
    AiEndGateway = __decorate([
        (0, websockets_1.WebSocketGateway)({
            path: '/ws/ai/',
            cors: {},
            serveClient: false
        }),
        __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(function () { return camera_service_1.CameraService; }))),
        __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(function () { return alarm_event_service_1.AlarmEventService; }))),
        __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(function () { return user_service_1.UserService; }))),
        __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(function () { return utils_service_1.UtilsService; })))
    ], AiEndGateway);
    return AiEndGateway;
}());
exports.AiEndGateway = AiEndGateway;
/**
 * 简单的 sleep 工具，用于在断开旧连接后稍作等待
 */
var sleep = function (ms) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
    });
}); };
