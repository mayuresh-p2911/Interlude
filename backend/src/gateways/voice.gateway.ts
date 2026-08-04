import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BaseGateway, AuthSocket } from './base.gateway';

// WebRTC signalling shapes — defined locally because RTCSessionDescriptionInit
// and RTCIceCandidateInit are DOM types unavailable in the Node.js lib.
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

@WebSocketGateway({
  namespace: '/',
  cors: { origin: '*', credentials: true },
})
export class VoiceGateway extends BaseGateway {
  @WebSocketServer() protected server!: Server;

  // roomId -> Set<userId>
  private voiceRooms = new Map<string, Set<string>>();

  constructor(jwtService: JwtService, configService: ConfigService) {
    super(jwtService, configService);
  }

  @SubscribeMessage('voice:join')
  handleJoinVoice(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!socket.userId) return;

    const room = this.voiceRooms.get(payload.roomId) ?? new Set<string>();
    const existingPeers = [...room];

    room.add(socket.userId);
    this.voiceRooms.set(payload.roomId, room);
    void socket.join(`voice:${payload.roomId}`);

    // Tell the new peer about existing peers
    socket.emit('voice:participant:join', {
      userId: socket.userId,
      existingPeers,
    });

    // Tell existing peers about the new peer
    socket.to(`voice:${payload.roomId}`).emit('voice:participant:join', {
      userId: socket.userId,
      existingPeers: [],
    });
  }

  @SubscribeMessage('voice:leave')
  handleLeaveVoice(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!socket.userId) return;

    const room = this.voiceRooms.get(payload.roomId);
    if (room) {
      room.delete(socket.userId);
      if (room.size === 0) this.voiceRooms.delete(payload.roomId);
    }

    void socket.leave(`voice:${payload.roomId}`);
    socket.to(`voice:${payload.roomId}`).emit('voice:participant:leave', {
      userId: socket.userId,
    });
  }

  // ── WebRTC Signalling ─────────────────────────────────────
  @SubscribeMessage('voice:offer')
  handleOffer(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { targetUserId: string; roomId: string; sdp: RTCSessionDescriptionInit },
  ) {
    this.server.to(`user:${payload.targetUserId}`).emit('voice:offer', {
      fromUserId: socket.userId,
      roomId: payload.roomId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('voice:answer')
  handleAnswer(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { targetUserId: string; roomId: string; sdp: RTCSessionDescriptionInit },
  ) {
    this.server.to(`user:${payload.targetUserId}`).emit('voice:answer', {
      fromUserId: socket.userId,
      roomId: payload.roomId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('voice:ice:candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { targetUserId: string; roomId: string; candidate: RTCIceCandidateInit },
  ) {
    this.server.to(`user:${payload.targetUserId}`).emit('voice:ice:candidate', {
      fromUserId: socket.userId,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('voice:mute')
  handleMute(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    socket.to(`voice:${payload.roomId}`).emit('voice:mute', { userId: socket.userId });
  }

  @SubscribeMessage('voice:unmute')
  handleUnmute(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    socket.to(`voice:${payload.roomId}`).emit('voice:unmute', { userId: socket.userId });
  }

  protected override onUserDisconnected(socket: AuthSocket, userId: string): void {
    // Remove from all voice rooms on disconnect
    this.voiceRooms.forEach((room, roomId) => {
      if (room.has(userId)) {
        room.delete(userId);
        if (room.size === 0) this.voiceRooms.delete(roomId);
        socket.to(`voice:${roomId}`).emit('voice:participant:leave', { userId });
      }
    });
  }
}
