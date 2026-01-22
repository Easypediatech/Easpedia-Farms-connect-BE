import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SavingsAccount,
  SavingsAccountDocument,
} from '../../schemas/savings-account.schema';

@Injectable()
export class SavingsService {
  constructor(
    @InjectModel(SavingsAccount.name)
    private savingsAccountModel: Model<SavingsAccountDocument>,
  ) {}

  async getByUserId(
    userId: Types.ObjectId,
  ): Promise<SavingsAccountDocument | null> {
    return this.savingsAccountModel.findOne({ farmer_id: userId }).exec();
  }

  async setSavingsPercentage(
    userId: Types.ObjectId,
    percentage: number,
  ): Promise<SavingsAccountDocument> {
    return this.savingsAccountModel
      .findOneAndUpdate(
        { farmer_id: userId },
        {
          $set: {
            savings_percentage: percentage,
            savings_percentage_set_at: new Date(),
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }
}
