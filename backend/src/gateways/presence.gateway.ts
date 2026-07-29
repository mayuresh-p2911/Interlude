import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { BaseGateway, AuthSocket } from './base.gateway';

@WebSocketGateway({
  namespace: '/',
  cors: { origin: '*', credentials: true },
})
export class PresenceGateway extends BaseGateway {
  @WebSocketServer() protected server!: Server;

  // Track connected sockets per user for multi-tab support
  private userSockets = new Map<string, Set<string>>();

  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super(jwtService, configService);
  }

  protected override async onUserConnected(socket: AuthSocket, userId: string) {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socket.id);
    this.userSockets.set(userId, sockets);

    // Update online status
    await this.userModel.findByIdAndUpdate(userId, { onlineStatus: 'online' });

    // Broadcast to all users (friends will filter on frontend)
    this.server.emit('user:online', { userId, username: socket.username });
  }

  protected override async onUserDisconnected(socket: AuthSocket, userId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // Last connection — go offline
        await this.userModel.findByIdAndUpdate(userId, {
          onlineStatus: 'offline',
          lastSeen: new Date(),
          currentActivity: null,
        });
        this.server.emit('user:offline', { userId });
      }
    }
  }

  // Called by other services to push activity updates
  broadcastActivity(userId: string, activity: unknown) {
    this.server.emit('user:activity', { userId, activity });
  }
}
