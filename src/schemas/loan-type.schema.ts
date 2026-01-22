import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoanTypeDocument = LoanType &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true })
export class LoanType {
  @Prop({ required: true, unique: true })
  name: string; // e.g., "Input Credit", "Farm Tools", "Equipment Loan", "Staff Personal Loan"

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: ['farmer', 'staff'],
    default: 'farmer',
    index: true,
  })
  user_type: string; // Type of user this loan is for

  @Prop({
    required: true,
    enum: ['input_credit', 'farm_tools', 'equipment', 'personal_loan', 'emergency_loan'],
    index: true,
  })
  category: string;

  @Prop({ required: true, min: 0, max: 30 })
  interest_rate: number; // Interest rate percentage (e.g., 10, 15)

  @Prop({ required: true, enum: [3, 6, 9, 12] })
  duration_months: number; // Loan duration in months

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: 0 })
  times_issued: number; // Number of times this loan type has been issued
}

export const LoanTypeSchema = SchemaFactory.createForClass(LoanType);

// Indexes
LoanTypeSchema.index({ user_type: 1, category: 1, is_active: 1 });
LoanTypeSchema.index({ user_type: 1, is_active: 1 });
