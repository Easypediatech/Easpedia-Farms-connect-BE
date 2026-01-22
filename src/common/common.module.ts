import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SmsService } from './services/sms.service';
import { SmsQueueService } from './services/sms-queue.service';
import { SMSLogRepository } from './repositories/sms-log.repository';
import { SMSLog, SMSLogSchema } from '../schemas/sms-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SMSLog.name, schema: SMSLogSchema }]),
  ],
  providers: [SmsService, SmsQueueService, SMSLogRepository],
  exports: [SmsService, SmsQueueService, SMSLogRepository],
})
export class CommonModule {}
