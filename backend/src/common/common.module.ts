import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { UploadService } from './upload.service';

@Module({
  providers: [EmailService, UploadService],
  exports: [EmailService, UploadService],
})
export class CommonModule {}
