import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WatchSessionsService } from '../watch-sessions/watch-sessions.service';
import { BaseGateway, AuthSocket } from './base.gateway';

interface SyncPayload {
  sessionId: string;
  state: 'playing' | 'paused';
  currentTime: number;
  playbackRate: number;
}

@WebSocketGateway({
  namespace: '/',
  cors: { origin: '*', credentials: true },
})
export class WatchGateway extends BaseGateway {
  @WebSocketServer() protected server!: Server;

  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    private watchSessionsService: WatchSessionsService,
  ) {
    super(jwtService, configService);
  }

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (!socket.userId) return;

    const session = await this.watchSessionsService.joinSession(payload.sessionId, socket.userId);
    await socket.join(`session:${payload.sessionId}`);

    // Send current state to the late-joining user
    socket.emit('session:state', session);

    // Notify other participants
    socket.to(`session:${payload.sessionId}`).emit('session:participant:join', {
      userId: socket.userId,
      username: socket.username,
    });
  }

  @SubscribeMessage('session:leave')
  async handleLeaveSession(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (!socket.userId) return;

    await this.watchSessionsService.leaveSession(payload.sessionId, socket.userId);
    await socket.leave(`session:${payload.sessionId}`);

    socket.to(`session:${payload.sessionId}`).emit('session:participant:leave', {
      userId: socket.userId,
    });
  }

  @SubscribeMessage('session:sync')
  async handleSync(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: SyncPayload,
  ) {
    if (!socket.userId) return;

    const updated = await this.watchSessionsService.syncPlayback(
      payload.sessionId,
      socket.userId,
      {
        state: payload.state,
        currentTime: payload.currentTime,
        playbackRate: payload.playbackRate,
      },
    );

    // Broadcast sync to all other participants in the session
    socket.to(`session:${payload.sessionId}`).emit('session:sync', {
      state: payload.state,
      currentTime: payload.currentTime,
      playbackRate: payload.playbackRate,
      syncedBy: socket.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('session:play')
  async handlePlay(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string; currentTime: number },
  ) {
    if (!socket.userId) return;
    await this.watchSessionsService.syncPlayback(payload.sessionId, socket.userId, {
      state: 'playing',
      currentTime: payload.currentTime,
      playbackRate: 1,
    });
    socket.to(`session:${payload.sessionId}`).emit('session:play', {
      currentTime: payload.currentTime,
      syncedBy: socket.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('session:pause')
  async handlePause(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string; currentTime: number },
  ) {
    if (!socket.userId) return;
    await this.watchSessionsService.syncPlayback(payload.sessionId, socket.userId, {
      state: 'paused',
      currentTime: payload.currentTime,
      playbackRate: 1,
    });
    socket.to(`session:${payload.sessionId}`).emit('session:pause', {
      currentTime: payload.currentTime,
      syncedBy: socket.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('session:seek')
  async handleSeek(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string; currentTime: number },
  ) {
    if (!socket.userId) return;
    socket.to(`session:${payload.sessionId}`).emit('session:seek', {
      currentTime: payload.currentTime,
      syncedBy: socket.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('session:speed')
  async handleSpeed(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string; playbackRate: number; currentTime: number },
  ) {
    if (!socket.userId) return;
    socket.to(`session:${payload.sessionId}`).emit('session:speed', {
      playbackRate: payload.playbackRate,
      currentTime: payload.currentTime,
      syncedBy: socket.userId,
    });
  }

  @SubscribeMessage('session:end')
  async handleEnd(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (!socket.userId) return;
    await this.watchSessionsService.leaveSession(payload.sessionId, socket.userId);
    this.server.to(`session:${payload.sessionId}`).emit('session:end', {
      endedBy: socket.userId,
    });
  }
}
