import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { PaystackService } from './paystack.service';
import { SavingsService } from './savings.service';
import { PayoutMonitoringService } from './payout-monitoring.service';
import { Wallet, WalletSchema } from '../../schemas/wallet.schema';
import {
  SavingsAccount,
  SavingsAccountSchema,
} from '../../schemas/savings-account.schema';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';
import {
  PayoutJobRecord,
  PayoutJobRecordSchema,
} from '../../schemas/payout-job.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Farmer, FarmerSchema } from '../../schemas/farmer.schema';
import { Staff, StaffSchema } from '../../schemas/staff.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: SavingsAccount.name, schema: SavingsAccountSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: PayoutJobRecord.name, schema: PayoutJobRecordSchema },
      { name: User.name, schema: UserSchema },
      { name: Farmer.name, schema: FarmerSchema },
      { name: Staff.name, schema: StaffSchema },
    ]),
    ConfigModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletRepository,
    PaystackService,
    SavingsService,
    PayoutMonitoringService,
  ],
  exports: [
    WalletService,
    PaystackService,
    SavingsService,
    PayoutMonitoringService,
  ],
})
export class WalletModule {}
