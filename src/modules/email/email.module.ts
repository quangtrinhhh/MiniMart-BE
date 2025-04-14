import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [MailerModule], // đã cấu hình ở app.module rồi
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
