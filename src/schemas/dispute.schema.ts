import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DisputeDocument = Dispute & Document;

@Schema({ timestamps: true })
export class Dispute {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true,
  })
  order_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  raised_by: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['farmer', 'buyer'] })
  raised_by_type: string;

  @Prop({
    required: true,
    enum: [
      'non_delivery',
      'quality_issue',
      'quantity_mismatch',
      'payment_issue',
    ],
    index: true,
  })
  dispute_type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  evidence_urls: string[];

  @Prop({
    default: 'open',
    enum: [
      'open',
      'under_review',
      'resolved_farmer',
      'resolved_buyer',
      'closed',
    ],
    index: true,
  })
  status: string;

  @Prop({ required: true })
  escrow_amount: number; // Amount held in escrow (kobo)

  @Prop()
  resolution?: string;

  @Prop()
  refund_amount?: number; // in kobo

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin' })
  resolved_by?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  reference: string; // DSP20251123001

  @Prop()
  resolved_at?: Date;

  @Prop()
  farmer_statement?: string;

  @Prop()
  buyer_statement?: string;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);

// Indexes
DisputeSchema.index({ raised_by: 1, status: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });

// Update resolved_at when status changes to resolved
DisputeSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (
      (this.status === 'resolved_farmer' ||
        this.status === 'resolved_buyer' ||
        this.status === 'closed') &&
      !this.resolved_at
    ) {
      this.resolved_at = new Date();
    }
  }

  next();
});
