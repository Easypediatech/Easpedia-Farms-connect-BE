import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true,
  })
  user_id?: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    enum: ['farmer', 'buyer', 'staff', 'organization'],
    index: true,
  })
  user_type: string;

  @Prop({ default: 0 })
  balance: number; // Available balance in kobo

  @Prop({ default: 0 })
  escrow_balance: number; // Locked funds in kobo

  @Prop({ default: 0 })
  savings_balance: number; // Savings account in kobo

  @Prop({ default: 0 })
  pension_balance: number; // Pension wallet balance in kobo (for staff)

  @Prop({ default: 0 })
  bonus_balance: number; // Bonus wallet balance in kobo (for staff)

  @Prop({ default: 0 })
  total_earned: number; // Lifetime earnings in kobo

  @Prop({ default: 0 })
  total_spent: number; // Lifetime spending in kobo

  @Prop({ default: 0 })
  total_withdrawn: number; // Total withdrawals in kobo

  @Prop({ default: 0 })
  total_deposited: number; // Total deposits in kobo

  @Prop()
  bank_name?: string;

  @Prop()
  bank_code?: string;

  @Prop()
  account_number?: string;

  @Prop()
  account_name?: string;

  @Prop()
  bvn?: string;

  @Prop()
  organization_name?: string; // For organization wallet type
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Compound unique index for user_id + user_type.
// Use a partial filter so documents without user_id (e.g., organization wallets) are not constrained by this index.
WalletSchema.index(
  { user_id: 1, user_type: 1 },
  { unique: true, partialFilterExpression: { user_id: { $exists: true } } },
);

// Ensure non-negative balances
WalletSchema.pre('save', function (next) {
  if (this.balance < 0) {
    return next(new Error('Balance cannot be negative'));
  }
  if (this.escrow_balance < 0) {
    return next(new Error('Escrow balance cannot be negative'));
  }
  if (this.savings_balance < 0) {
    return next(new Error('Savings balance cannot be negative'));
  }
  if (this.bonus_balance < 0) {
    return next(new Error('Bonus balance cannot be negative'));
  }
  next();
});
