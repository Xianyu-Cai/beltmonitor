"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
exports.UtilsService = void 0;
var common_1 = require("@nestjs/common");
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var crypto_1 = require("crypto");
var UtilsService = /** @class */ (function () {
    function UtilsService(configService) {
        this.configService = configService;
        this.publicDirPath = this.configService.getOrThrow('PUBLIC_DIR_ABSOLUTE_PATH');
        this.URLToPublicDir = '/public';
    }
    /**
     * Write image file to the public path from base64
     * @param base64Image base64 file data
     * @returns the written file path with the randomly generated file name
     */
    UtilsService.prototype.writeBase64ImageToFile = function (base64Image) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var fileExt, base64Data, dataBuffer, filePath;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        fileExt = (_a = /data:image\/(.+?);base64,/.exec(base64Image)) === null || _a === void 0 ? void 0 : _a[1];
                        if (!fileExt)
                            throw new Error('Invalid file type');
                        base64Data = base64Image.replace(/data:image\/(.+?);base64,/, '');
                        dataBuffer = Buffer.from(base64Data, 'base64');
                        filePath = path_1["default"].join(this.publicDirPath, "".concat((0, crypto_1.randomBytes)(10).toString('hex'), ".").concat(fileExt));
                        return [4 /*yield*/, fs_extra_1["default"].ensureDir(this.publicDirPath)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, fs_extra_1["default"].writeFile(filePath, dataBuffer)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, filePath];
                }
            });
        });
    };
    UtilsService.prototype.filePathToURL = function (filePath) {
        return filePath.replace(this.publicDirPath, this.URLToPublicDir);
    };
    UtilsService = __decorate([
        (0, common_1.Injectable)()
    ], UtilsService);
    return UtilsService;
}());
exports.UtilsService = UtilsService;
