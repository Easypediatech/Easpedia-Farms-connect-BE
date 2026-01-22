import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { FarmerModule } from './modules/farmer/farmer.module';
import { BuyerModule } from './modules/buyer/buyer.module';
import { StaffModule } from './modules/staff/staff.module';
import { UssdModule } from './modules/ussd/ussd.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { LoanModule } from './modules/loan/loan.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { DojahModule } from './modules/dojah/dojah.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { BonusModule } from './modules/bonus/bonus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        'mongodb+srv://saintagbukor_db_user:wNKjyav5DaNzKtLH@cluster0.a8wrrqs.mongodb.net/farmconnect',
    ),
    AdminModule,
    FarmerModule,
    BuyerModule,
    StaffModule,
    UssdModule,
    WalletModule,
    LoanModule,
    PurchasesModule,
    SettingsModule,
    TransactionModule,
    DojahModule,
    PayrollModule,
    BonusModule,
  ],
  controllers: [AppController],
  providers: [AppService, Reflector],
})
export class AppModule {}
