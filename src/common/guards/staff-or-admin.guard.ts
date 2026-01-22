import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class StaffOrAdminGuard implements CanActivate {
  private readonly logger = new Logger(StaffOrAdminGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.log(`StaffOrAdminGuard checking user: ${JSON.stringify(user)}`);

    if (!user || (user.type !== 'admin' && user.type !== 'staff')) {
      this.logger.error(
        `StaffOrAdminGuard denying access: user type ${user?.type}`,
      );
      throw new ForbiddenException(
        'Access restricted to administrators and staff only',
      );
    }

    this.logger.log(
      `StaffOrAdminGuard allowing access for user ${user?.sub} (${user?.type})`,
    );
    return true;
  }
}
