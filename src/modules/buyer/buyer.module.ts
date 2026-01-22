import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { Buyer, BuyerSchema } from '../../schemas/buyer.schema';
import { SMSLog, SMSLogSchema } from '../../schemas/sms-log.schema';
import { BuyerController } from './buyer.controller';
import { BuyerService } from './buyer.service';
import { BuyerRepository } from './buyer.repository';
import { SmsService } from '../../common/services/sms.service';
import { SmsQueueService } from '../../common/services/sms-queue.service';
import { SMSLogRepository } from '../../common/repositories/sms-log.repository';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Buyer.name, schema: BuyerSchema },
            { name: SMSLog.name, schema: SMSLogSchema },
        ]),
        WalletModule,
    ],
    controllers: [BuyerController],
    providers: [
        BuyerService,
        BuyerRepository,
        SmsService,
        SmsQueueService,
        SMSLogRepository,
    ],
    exports: [BuyerService, BuyerRepository],
})
export class BuyerModule { }
