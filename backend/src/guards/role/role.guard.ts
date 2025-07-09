import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRole = this.reflector.get('role', context.getClass());
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 打印日志查看 user 对象内容
    console.log('User from request:', user);

    const userRole = user?.role;
    return userRole === 'admin' || userRole === requiredRole;
  }
}
