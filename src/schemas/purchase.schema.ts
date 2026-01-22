import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PurchaseDocument = Purchase & Document;

@Schema({ timestamps: true })
export class Purchase {
  @Prop({ required: true })
  farmerId: string;

  @Prop({ required: true })
  farmerName: string;

  @Prop({ required: true })
  farmerPhone: string;

  @Prop({ required: true })
  weightKg: number;

  @Prop({ required: true })
  pricePerKg: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, enum: ['kg', 'ton'] })
  unit: string;

  @Prop({ required: true, enum: ['cash', 'wallet', 'bank_transfer'] })
  paymentMethod: string;

  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' })
  status: string;

  @Prop({ required: true, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' })
  paymentStatus: string;

  @Prop({ required: true })
  recordedById: string;

  @Prop({ required: true })
  recordedBy: string;

  @Prop()
  location?: string;

  @Prop()
  notes?: string;

  // Financial tracking fields
  @Prop()
  walletTransactionId?: string; // Reference to wallet transaction

  @Prop()
  loanDeductionAmount?: number; // Amount deducted from loan in kobo

  @Prop()
  loanDeductionTransactionId?: string; // Reference to loan payment transaction

  @Prop()
  savingsDeductionAmount?: number; // Amount saved to savings account in kobo

  @Prop()
  savingsTransactionId?: string; // Reference to savings transaction

  @Prop()
  netAmountCredited?: number; // Final amount credited to wallet after loan and savings deduction in kobo

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);