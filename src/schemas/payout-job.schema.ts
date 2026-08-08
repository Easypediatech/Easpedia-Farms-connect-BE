import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

/** External rail used to actually move money out to the beneficiary. */
export type PayoutRail = 'paystack' | 'paygate';

export type PayoutJobStatus =
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'manual_review';

export type PayoutJobDocument = PayoutJobRecord &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * One outbound payout attempt created when a farmer or staff member
 * withdraws from their wallet. Mirrors the `withdrawalpayoutjobs`
 * collection that the wallet withdrawal flow writes to; this schema is
 * intentionally read-oriented for the admin monitoring screens and does
 * not attempt to model every write-path concern (retries, provider
 * webhooks, etc.) beyond what's needed to display a record.
 */
@Schema({ timestamps: true, collection: 'withdrawalpayoutjobs' })
export class PayoutJobRecord {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true,
    index: true,
  })
  wallet_transaction_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  wallet_transaction_reference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['farmer', 'staff'], index: true })
  user_type: 'farmer' | 'staff';

  @Prop()
  user_name?: string;

  @Prop()
  user_phone?: string;

  /** Net amount paid out to the beneficiary, in kobo. */
  @Prop({ required: true })
  amount: number;

  /** What was actually debited from the user's wallet (amount + fee). */
  @Prop({ required: true, default: 0 })
  requested_amount: number;

  /** Withdrawal fee netted out and credited to the Charges wallet. */
  @Prop({ required: true, default: 0 })
  fee_amount: number;

  @Prop({ required: true, enum: ['NGN'], default: 'NGN' })
  currency: 'NGN';

  @Prop({ required: true, index: true })
  journal_id: string;

  @Prop({ required: true })
  bank_name: string;

  @Prop({ required: true })
  bank_code: string;

  @Prop({ required: true })
  account_number: string;

  @Prop({ required: true })
  account_name: string;

  @Prop({ required: true, unique: true, index: true })
  transfer_reference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Wallet' })
  organization_wallet_id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction' })
  organization_wallet_transaction_id?: MongooseSchema.Types.ObjectId;

  @Prop()
  organization_wallet_balance_before?: number;

  @Prop()
  organization_wallet_balance_after?: number;

  @Prop()
  user_wallet_balance_before?: number;

  @Prop()
  user_wallet_balance_after?: number;

  @Prop()
  paystack_transfer_code?: string;

  @Prop()
  paystack_recipient_code?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['paystack', 'paygate'],
    index: true,
  })
  payout_provider: PayoutRail;

  @Prop()
  provider_status?: string;

  @Prop()
  provider_response_code?: string;

  @Prop()
  provider_reference?: string;

  @Prop()
  provider_payment_id?: string;

  @Prop()
  provider_request_ref?: string;

  @Prop({
    required: true,
    enum: [
      'pending',
      'processing',
      'retrying',
      'completed',
      'failed',
      'manual_review',
    ],
    default: 'pending',
    index: true,
  })
  status: PayoutJobStatus;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ required: true, default: 5 })
  max_attempts: number;

  @Prop({ index: true })
  next_retry_at?: Date;

  @Prop()
  last_error?: string;

  @Prop()
  idempotency_key?: string;

  @Prop()
  request_hash?: string;

  @Prop({
    required: true,
    enum: ['staff_api', 'ussd_farmer', 'ussd_staff', 'api'],
    default: 'api',
  })
  source: 'staff_api' | 'ussd_farmer' | 'ussd_staff' | 'api';

  @Prop({ default: false })
  refunded: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction' })
  refund_transaction_id?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction' })
  organization_refund_transaction_id?: Types.ObjectId;

  @Prop()
  processed_at?: Date;

  @Prop()
  failed_at?: Date;
}

export const PayoutJobRecordSchema =
  SchemaFactory.createForClass(PayoutJobRecord);

// Support the admin list/kpi screens: filter by status + retry window, and
// paginate a single user's history newest-first.
PayoutJobRecordSchema.index({ status: 1, next_retry_at: 1, createdAt: 1 });
PayoutJobRecordSchema.index({ user_id: 1, createdAt: -1 });
