import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  reporter_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['farmer', 'buyer'] })
  reporter_type: string;

  @Prop({ required: true })
  reporter_name: string;

  @Prop({ required: true })
  reporter_phone: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', index: true })
  order_id?: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'buyer_no_show',
      'payment_issue',
      'quality_dispute',
      'technical_issue',
      'fraud_attempt',
      'other',
    ],
    index: true,
  })
  issue_type: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'investigating', 'resolved', 'closed'],
    index: true,
  })
  status: string;

  @Prop({
    default: 'medium',
    enum: ['low', 'medium', 'high', 'urgent'],
    index: true,
  })
  priority: string;

  @Prop({ required: true, unique: true, index: true })
  reference: string; // RPT20251123001

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin', index: true })
  assigned_to?: MongooseSchema.Types.ObjectId;

  @Prop()
  assigned_at?: Date;

  @Prop()
  resolved_at?: Date;

  @Prop()
  resolution_notes?: string;

  @Prop({
    type: [
      {
        action: String,
        performed_by: MongooseSchema.Types.ObjectId,
        performed_at: Date,
        notes: String,
      },
    ],
    default: [],
  })
  admin_actions: Array<{
    action: string;
    performed_by: MongooseSchema.Types.ObjectId;
    performed_at: Date;
    notes?: string;
  }>;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Compound Indexes
ReportSchema.index({ reporter_id: 1, status: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: 1, createdAt: -1 });
ReportSchema.index({ assigned_to: 1, status: 1 });

// Update timestamps based on status changes
ReportSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    if (this.status === 'resolved' || this.status === 'closed') {
      if (!this.resolved_at) {
        this.resolved_at = now;
      }
    }
  }

  if (this.isModified('assigned_to') && this.assigned_to && !this.assigned_at) {
    this.assigned_at = new Date();
  }

  next();
});
