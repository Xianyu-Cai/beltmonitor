import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { User } from 'src/services/user/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const request = context.switchToHttp().getRequest<Request>();
    // const token = this.extractTokenFromHeader(request);

    // if (!token) {
    //   throw new UnauthorizedException('Token not provided');
    // }

    // try {
    //   const payload = await this.jwtService.verifyAsync<User>(token);
    //   const cachedToken = await this.cache.get<string>(payload.username);

    //   if (token !== cachedToken) {
    //     throw new UnauthorizedException('Invalid or expired token');
    //   }

    //   (request as any).user = payload; // 或者使用扩展后的类型
    // } catch (error) {
    //   throw new UnauthorizedException('Invalid or expired token');
    // }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization || '';
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
