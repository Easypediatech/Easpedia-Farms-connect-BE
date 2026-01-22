import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { UssdAnalyticsService } from './ussd-analytics.service';
import {
  UssdSession,
  UssdSessionSchema,
} from '../../schemas/ussd-session.schema';
import { FarmerModule } from '../farmer/farmer.module';
import { BuyerModule } from '../buyer/buyer.module';
import { StaffModule } from '../staff/staff.module';
import { WalletModule } from '../wallet/wallet.module';
import { LoanModule } from '../loan/loan.module';
import { AdminModule } from '../admin/admin.module';
import { DojahModule } from '../dojah/dojah.module';
import { SmsService } from '../../common/services/sms.service';
import { SmsQueueService } from '../../common/services/sms-queue.service';
import { SMSLogRepository } from '../../common/repositories/sms-log.repository';
import { SMSLog, SMSLogSchema } from '../../schemas/sms-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UssdSession.name, schema: UssdSessionSchema },
      { name: SMSLog.name, schema: SMSLogSchema },
    ]),
    FarmerModule,
    BuyerModule,
    StaffModule,
    WalletModule,
    LoanModule,
    AdminModule,
    DojahModule,
  ],
  controllers: [UssdController],
  providers: [
    UssdService,
    UssdAnalyticsService,
    SmsService,
    SmsQueueService,
    SMSLogRepository,
  ],
  exports: [UssdService, UssdAnalyticsService],
})
export class UssdModule {}
