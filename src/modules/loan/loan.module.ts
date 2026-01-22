import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';
import { LoanTypeRepository } from './loan-type.repository';
import { Loan, LoanSchema } from '../../schemas/loan.schema';
import { LoanType, LoanTypeSchema } from '../../schemas/loan-type.schema';
import { Farmer, FarmerSchema } from '../../schemas/farmer.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffOrAdminGuard } from '../../common/guards/staff-or-admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Loan.name, schema: LoanSchema },
      { name: LoanType.name, schema: LoanTypeSchema },
      { name: Farmer.name, schema: FarmerSchema },
      { name: User.name, schema: UserSchema },
      { name: Staff.name, schema: StaffSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LoanController],
  providers: [
    LoanService,
    LoanRepository,
    LoanTypeRepository,
    JwtStrategy,
    JwtAuthGuard,
    StaffOrAdminGuard,
  ],
  exports: [LoanService, LoanRepository, LoanTypeRepository],
})
export class LoanModule {}
