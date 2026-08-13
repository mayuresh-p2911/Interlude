import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return (request?.cookies?.['refresh_token'] as string) ?? null;
        },
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: { sub: string; username: string; email: string; isAdmin: boolean; rememberMe?: boolean },
  ) {
    const refreshToken =
      (request?.cookies?.['refresh_token'] as string) ??
      (request?.body as { refreshToken?: string })?.refreshToken;
    return { ...payload, _id: payload.sub, refreshToken, rememberMe: !!payload.rememberMe };
  }
}
