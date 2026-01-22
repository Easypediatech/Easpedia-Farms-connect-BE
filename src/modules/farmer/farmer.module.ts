import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { Farmer, FarmerSchema } from '../../schemas/farmer.schema';
import { Purchase, PurchaseSchema } from '../../schemas/purchase.schema';
import { SMSLog, SMSLogSchema } from '../../schemas/sms-log.schema';
import { FarmerController } from './farmer.controller';
import { FarmerService } from './farmer.service';
import { FarmerRepository } from './farmer.repository';
import { SmsService } from '../../common/services/sms.service';
import { SmsQueueService } from '../../common/services/sms-queue.service';
import { SMSLogRepository } from '../../common/repositories/sms-log.repository';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Farmer.name, schema: FarmerSchema },
            { name: Purchase.name, schema: PurchaseSchema },
            { name: SMSLog.name, schema: SMSLogSchema },
        ]),
        WalletModule,
    ],
    controllers: [FarmerController],
    providers: [
        FarmerService,
        FarmerRepository,
        SmsService,
        SmsQueueService,
        SMSLogRepository,
    ],
    exports: [FarmerService, FarmerRepository],
})
export class FarmerModule { }
