"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ControllersModule = void 0;
var common_1 = require("@nestjs/common");
var user_controller_1 = require("./user/user.controller");
var common_controller_1 = require("./common/common.controller");
var admin_controller_1 = require("./admin/admin.controller");
var core_1 = require("@nestjs/core");
var exception_transformer_filter_1 = require("../../../../../../src/interceptors/exception-transformer/exception-transformer.filter");
var response_transformer_interceptor_1 = require("../../../../../../src/interceptors/response-transformer/response-transformer.interceptor");
var services_module_1 = require("../../../../../../src/services/services.module");
var ControllersModule = /** @class */ (function () {
    function ControllersModule() {
    }
    ControllersModule = __decorate([
        (0, common_1.Module)({
            imports: [services_module_1.ServicesModule],
            controllers: [user_controller_1.UserController, common_controller_1.CommonController, admin_controller_1.AdminController],
            providers: [
                { provide: core_1.APP_FILTER, useClass: exception_transformer_filter_1.ExceptionTransformerFilter },
                { provide: core_1.APP_INTERCEPTOR, useClass: response_transformer_interceptor_1.ResponseTransformerInterceptor },
            ]
        })
    ], ControllersModule);
    return ControllersModule;
}());
exports.ControllersModule = ControllersModule;
