import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { PaystackService } from './paystack.service';
import { SavingsService } from './savings.service';
import { Wallet, WalletSchema } from '../../schemas/wallet.schema';
import {
  SavingsAccount,
  SavingsAccountSchema,
} from '../../schemas/savings-account.schema';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: SavingsAccount.name, schema: SavingsAccountSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    ConfigModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, PaystackService, SavingsService],
  exports: [WalletService, PaystackService, SavingsService],
})
export class WalletModule {}
