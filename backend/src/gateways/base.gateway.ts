import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// ── JWT Socket Auth Helper ────────────────────────────────────
export interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

export function extractUserFromSocket(
  socket: AuthSocket,
  jwtService: JwtService,
  jwtSecret: string,
): { userId: string; username: string } | null {
  try {
    const token =
      (socket.handshake.auth?.token as string) ??
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) return null;
    const payload = jwtService.verify<{ sub: string; username: string }>(token, { secret: jwtSecret });
    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

// ── Base Gateway ──────────────────────────────────────────────
export abstract class BaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  protected server!: Server;

  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected jwtService: JwtService,
    protected configService: ConfigService,
  ) {}

  async handleConnection(socket: AuthSocket) {
    const user = extractUserFromSocket(
      socket,
      this.jwtService,
      this.configService.get<string>('JWT_SECRET') ?? '',
    );

    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.userId = user.userId;
    socket.username = user.username;
    socket.join(`user:${user.userId}`);
    this.onUserConnected(socket, user.userId);
  }

  handleDisconnect(socket: AuthSocket) {
    if (socket.userId) {
      this.onUserDisconnected(socket, socket.userId);
    }
  }

  protected onUserConnected(_socket: AuthSocket, _userId: string): void {}
  protected onUserDisconnected(_socket: AuthSocket, _userId: string): void {}
}
