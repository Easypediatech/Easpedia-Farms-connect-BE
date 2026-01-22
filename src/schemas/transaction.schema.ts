import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    index: true,
  })
  user_id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['farmer', 'buyer', 'staff', 'organization'] })
  user_type: string;

  @Prop({
    required: true,
    enum: [
      'sale',
      'purchase',
      'withdrawal',
      'deposit',
      'loan_disbursement',
      'loan_repayment',
      'savings_deposit',
      'savings_withdrawal',
      'escrow_hold',
      'escrow_release',
      'organization_funding',
      'payroll_disbursement',
      'bonus_wallet_funding',
      'bonus_allocation',
      'bonus_transfer',
    ],
    index: true,
  })
  type: string;

  @Prop({ required: true })
  amount: number; // in kobo

  @Prop({ required: true })
  balance_before: number; // in kobo

  @Prop({ required: true })
  balance_after: number; // in kobo

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order' })
  order_id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Listing' })
  listing_id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Loan', index: true })
  loan_id?: MongooseSchema.Types.ObjectId;

  @Prop({
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    index: true,
  })
  status: string;

  @Prop({ required: true, unique: true })
  reference: string; // TXN20251123001

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;

  @Prop()
  completed_at?: Date;

  @Prop()
  failed_at?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Compound Indexes
TransactionSchema.index({ user_id: 1, createdAt: -1 });
TransactionSchema.index({ user_id: 1, type: 1, status: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ order_id: 1 });

// Update timestamp fields based on status changes
TransactionSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'completed':
        if (!this.completed_at) this.completed_at = now;
        break;
      case 'failed':
        if (!this.failed_at) this.failed_at = now;
        break;
    }
  }

  next();
});
