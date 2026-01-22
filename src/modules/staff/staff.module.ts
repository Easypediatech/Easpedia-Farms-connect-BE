import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { WalletModule } from '../wallet/wallet.module';
import { LoanModule } from '../loan/loan.module';
import { CommonModule } from '../../common/common.module';
import { OtpService } from '../../common/services/otp.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Staff.name, schema: StaffSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'farmconnect-secret-key-change-in-production',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    WalletModule,
    LoanModule,
    CommonModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository, OtpService],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
