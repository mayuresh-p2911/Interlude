import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BaseGateway, AuthSocket } from './base.gateway';
import { Server } from 'socket.io';
import { WebSocketServer } from '@nestjs/websockets';

@WebSocketGateway({
  namespace: '/',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway extends BaseGateway {
  @WebSocketServer() protected server!: Server;

  // Track typing state: conversationId -> Set<userId>
  private typingUsers = new Map<string, Set<string>>();

  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {
    super(jwtService, configService);
  }

  // ── Direct Messages ───────────────────────────────────────
  @SubscribeMessage('dm:send')
  async handleDMSend(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody()
    payload: {
      recipientId: string;
      content: string;
      type?: 'text' | 'movie_share';
      movieRef?: { movieId: string; title: string; poster?: string };
    },
  ) {
    if (!socket.userId) return;

    const message = await this.chatService.sendDirectMessage(
      socket.userId,
      payload.recipientId,
      payload.content,
      payload.type ?? 'text',
      { movieRef: payload.movieRef },
    );

    const senderMessage = await this.chatService.formatMessageForUser(message, socket.userId);
    const recipientMessage = await this.chatService.formatMessageForUser(message, payload.recipientId);

    // Emit to both sender and recipient (filtered per viewer)
    this.server.to(`user:${socket.userId}`).emit('dm:receive', senderMessage);
    this.server.to(`user:${payload.recipientId}`).emit('dm:receive', recipientMessage);

    // Notify recipient
    await this.notificationsService.create({
      recipient: payload.recipientId,
      type: 'message',
      title: 'New Message',
      body: `${socket.username ?? 'Someone'} sent you a message`,
      data: { senderId: socket.userId },
    });
    this.server.to(`user:${payload.recipientId}`).emit('notification:new', { type: 'message' });
  }

  @SubscribeMessage('dm:typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { recipientId: string },
  ) {
    if (!socket.userId) return;
    this.server
      .to(`user:${payload.recipientId}`)
      .emit('dm:typing:start', { userId: socket.userId, username: socket.username });
  }

  @SubscribeMessage('dm:typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { recipientId: string },
  ) {
    if (!socket.userId) return;
    this.server
      .to(`user:${payload.recipientId}`)
      .emit('dm:typing:stop', { userId: socket.userId });
  }

  @SubscribeMessage('dm:read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!socket.userId) return;
    await this.chatService.markMessagesRead(payload.conversationId, socket.userId);
    this.server.to(`user:${socket.userId}`).emit('dm:read', payload);
  }

  // ── Group Chat ────────────────────────────────────────────
  @SubscribeMessage('group:join')
  handleGroupJoin(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    void socket.join(`group:${payload.groupId}`);
  }

  @SubscribeMessage('group:message:send')
  async handleGroupMessage(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody()
    payload: {
      groupId: string;
      content: string;
      type?: 'text' | 'movie_share';
      movieRef?: { movieId: string; title: string; poster?: string };
    },
  ) {
    if (!socket.userId) return;

    const message = await this.chatService.sendGroupMessage(
      socket.userId,
      payload.groupId,
      payload.content,
      payload.type ?? 'text',
      { movieRef: payload.movieRef },
    );

    this.server.to(`group:${payload.groupId}`).emit('group:message:receive', message);
  }

  @SubscribeMessage('group:typing:start')
  handleGroupTypingStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!socket.userId) return;
    socket.to(`group:${payload.groupId}`).emit('group:typing:start', {
      userId: socket.userId,
      username: socket.username,
    });
  }

  @SubscribeMessage('group:typing:stop')
  handleGroupTypingStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!socket.userId) return;
    socket.to(`group:${payload.groupId}`).emit('group:typing:stop', { userId: socket.userId });
  }
}
