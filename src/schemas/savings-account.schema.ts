import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SavingsAccountDocument = SavingsAccount & Document;

@Schema({ timestamps: true })
export class SavingsAccount {
  @Prop({ 
    default: null, 
    min: 0, 
    max: 100,
    validate: {
      validator: function(v: number) {
        return v === null || (v >= 0 && v <= 100);
      },
      message: 'Savings percentage must be between 0 and 100'
    }
  })
  savings_percentage: number;

  @Prop({ default: null })
  savings_percentage_set_at: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'user_type_ref',
    required: true,
    index: true,
  })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['farmer', 'staff'], 
    default: 'farmer' 
  })
  user_type: string;

  @Prop({ default: 0 })
  balance: number; // in kobo

  @Prop({ default: 8 })
  interest_rate: number; // Annual percentage

  @Prop({ default: 0 })
  total_interest_earned: number; // in kobo

  @Prop({ default: 0 })
  total_deposits: number; // in kobo

  @Prop({ default: 0 })
  total_withdrawals: number; // in kobo

  @Prop()
  last_interest_calculation: Date;
}

export const SavingsAccountSchema =
  SchemaFactory.createForClass(SavingsAccount);

// Indexes - unique index on user_id + user_type combination
SavingsAccountSchema.index({ user_id: 1, user_type: 1 }, { unique: true });
SavingsAccountSchema.index({ balance: 1 }); // For daily interest calculation cron

// Ensure non-negative balance
SavingsAccountSchema.pre('save', function (next) {
  if (this.balance < 0) {
    return next(new Error('Savings balance cannot be negative'));
  }
  next();
});

// Method to calculate daily interest
SavingsAccountSchema.methods.calculateDailyInterest = function (): number {
  // Daily interest rate = (annual rate / 365)
  const dailyRate = this.interest_rate / 365 / 100;
  const dailyInterest = Math.round(this.balance * dailyRate);
  return dailyInterest;
};
