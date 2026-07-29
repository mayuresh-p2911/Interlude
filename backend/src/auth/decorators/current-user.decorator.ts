import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
