import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    this.logger.log('JwtAuthGuard canActivate called');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(
      `JwtAuthGuard handleRequest: err=${JSON.stringify(err)}, user=${JSON.stringify(user)}, info=${JSON.stringify(info)}`,
    );
    if (err || !user) {
      this.logger.error(`JwtAuthGuard throwing: ${err?.message || 'No user'}`);
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    this.logger.log(`JwtAuthGuard success: user ${user?.sub} (${user?.type})`);
    return user;
  }
}
