import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

@Injectable()
export class VoiceService {
  constructor(private configService: ConfigService) {}

  getIceServers(): IceServerConfig[] {
    const servers: IceServerConfig[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const turnUrl = this.configService.get<string>('TURN_SERVER_URL');
    const turnUsername = this.configService.get<string>('TURN_USERNAME');
    const turnPassword = this.configService.get<string>('TURN_PASSWORD');

    if (turnUrl && turnUsername && turnPassword) {
      servers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnPassword,
      });
    }

    return servers;
  }
}
