"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.RoleGuard = void 0;
var common_1 = require("@nestjs/common");
var RoleGuard = /** @class */ (function () {
    function RoleGuard(reflector) {
        this.reflector = reflector;
    }
    RoleGuard.prototype.canActivate = function (context) {
        var requiredRole = this.reflector.get('role', context.getClass());
        var request = context.switchToHttp().getRequest();
        var user = request.user;
        // 打印日志查看 user 对象内容
        console.log('User from request:', user);
        var userRole = user === null || user === void 0 ? void 0 : user.role;
        return userRole === 'admin' || userRole === requiredRole;
    };
    RoleGuard = __decorate([
        (0, common_1.Injectable)()
    ], RoleGuard);
    return RoleGuard;
}());
exports.RoleGuard = RoleGuard;
