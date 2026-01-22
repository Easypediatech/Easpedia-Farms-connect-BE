import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BonusController } from './bonus.controller';
import { BonusService } from './bonus.service';
import { WalletModule } from '../wallet/wallet.module';
import { StaffModule } from '../staff/staff.module';
import { Wallet, WalletSchema } from '../../schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    WalletModule,
    StaffModule,
  ],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}