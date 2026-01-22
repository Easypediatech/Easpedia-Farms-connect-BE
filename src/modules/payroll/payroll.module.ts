import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './payroll.repository';
import { PayrollCronService } from './payroll-cron.service';
import {
  Payroll,
  PayrollSchema,
  PayrollTransaction,
  PayrollTransactionSchema,
} from '../../schemas';
import { SMSLog, SMSLogSchema } from '../../schemas/sms-log.schema';
import { Loan, LoanSchema } from '../../schemas/loan.schema';
import {
  Transaction,
  TransactionSchema,
} from '../../schemas/transaction.schema';
import { StaffModule } from '../staff/staff.module';
import { WalletModule } from '../wallet/wallet.module';
import { SettingsModule } from '../settings/settings.module';
import { SmsService } from '../../common/services/sms.service';
import { SmsQueueService } from '../../common/services/sms-queue.service';
import { SMSLogRepository } from '../../common/repositories/sms-log.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payroll.name, schema: PayrollSchema },
      { name: PayrollTransaction.name, schema: PayrollTransactionSchema },
      { name: SMSLog.name, schema: SMSLogSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    ScheduleModule.forRoot(), // Enable cron jobs
    StaffModule,
    WalletModule,
    SettingsModule,
  ],
  controllers: [PayrollController],
  providers: [
    PayrollService,
    PayrollRepository,
    PayrollCronService,
    SmsService,
    SmsQueueService,
    SMSLogRepository,
  ],
  exports: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
