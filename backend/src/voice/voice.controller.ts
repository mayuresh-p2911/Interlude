import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VoiceService } from './voice.service';

@ApiTags('Voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get('ice-servers')
  @ApiOperation({ summary: 'Get ICE server configuration for WebRTC' })
  getIceServers() {
    return { iceServers: this.voiceService.getIceServers() };
  }
}
