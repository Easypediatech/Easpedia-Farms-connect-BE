import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchasesRepository } from './purchases.repository';
import { Purchase, PurchaseSchema } from '../../schemas/purchase.schema';
import { Farmer, FarmerSchema } from '../../schemas/farmer.schema';
import { Admin, AdminSchema } from '../../schemas/admin.schema';
import { Wallet, WalletSchema } from '../../schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';
import { Loan, LoanSchema } from '../../schemas/loan.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { SavingsAccount, SavingsAccountSchema } from '../../schemas/savings-account.schema';
import { FarmerRepository } from '../farmer/farmer.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Farmer.name, schema: FarmerSchema },
      { name: User.name, schema: UserSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: SavingsAccount.name, schema: SavingsAccountSchema },
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchasesRepository, FarmerRepository],
  exports: [PurchasesService, PurchasesRepository],
})
export class PurchasesModule {}