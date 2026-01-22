import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import {
  Transaction,
  TransactionSchema,
  Wallet,
  WalletSchema,
  Loan,
  LoanSchema,
  Purchase,
  PurchaseSchema,
  User,
  UserSchema,
} from '../../schemas';
import { FarmerModule } from '../farmer/farmer.module';
import { BuyerModule } from '../buyer/buyer.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    FarmerModule,
    BuyerModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
