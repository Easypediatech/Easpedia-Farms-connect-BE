import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { ProductRepository } from './product.repository';
import { Admin, AdminSchema } from '../../schemas/admin.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Farmer, FarmerSchema } from '../../schemas/farmer.schema';
import { Buyer, BuyerSchema } from '../../schemas/buyer.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import {
  Transaction,
  TransactionSchema,
} from '../../schemas/transaction.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Purchase, PurchaseSchema } from '../../schemas/purchase.schema';
import {
  UssdSession,
  UssdSessionSchema,
} from '../../schemas/ussd-session.schema';
import { Loan, LoanSchema } from '../../schemas/loan.schema';
import { LoanType, LoanTypeSchema } from '../../schemas/loan-type.schema';
import { SMSLog, SMSLogSchema } from '../../schemas/sms-log.schema';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import { Wallet, WalletSchema } from '../../schemas/wallet.schema';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WalletModule } from '../wallet/wallet.module';
import { WalletService } from '../wallet/wallet.service';
import { FarmerModule } from '../farmer/farmer.module';
import { LoanRepository } from '../loan/loan.repository';
import { SmsService } from '../../common/services/sms.service';
import { OtpService } from '../../common/services/otp.service';
import { SmsQueueService } from '../../common/services/sms-queue.service';
import { SMSLogRepository } from '../../common/repositories/sms-log.repository';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Farmer.name, schema: FarmerSchema },
      { name: Buyer.name, schema: BuyerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: UssdSession.name, schema: UssdSessionSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: LoanType.name, schema: LoanTypeSchema },
      { name: SMSLog.name, schema: SMSLogSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'farmconnect-secret-key-change-in-production',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
    WalletModule,
    FarmerModule,
    StaffModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    ProductRepository,
    LoanRepository,
    SmsService,
    OtpService,
    SmsQueueService,
    SMSLogRepository,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
  ],
  exports: [AdminService],
})
export class AdminModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly adminService: AdminService,
  ) {}

  onModuleInit(): void {
    // Inject WalletService into AdminService to avoid circular dependency
    const walletService = this.moduleRef.get(WalletService, { strict: false });
    this.adminService.setWalletService(walletService);
  }
}
