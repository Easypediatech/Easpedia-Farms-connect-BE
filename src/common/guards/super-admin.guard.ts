import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Restricts a route to admins whose JWT role claim is 'super_admin'.
 * Must run after JwtAuthGuard (needs request.user already populated).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (user.role || '').toLowerCase() !== 'super_admin') {
      throw new ForbiddenException('Access restricted to super administrators only');
    }

    return true;
  }
}
