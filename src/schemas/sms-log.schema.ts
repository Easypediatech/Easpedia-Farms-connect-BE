import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SMSLogDocument = SMSLog & Document;

@Schema({ timestamps: true })
export class SMSLog {
  @Prop({ required: true, index: true })
  recipient_phone: string;

  @Prop()
  sender_id?: string; // e.g., "FarmConnect"

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: [
      'registration',
      'listing_created',
      'offer_received',
      'offer_sent',
      'offer_accepted',
      'payment_confirmed',
      'delivery_confirmed',
      'loan_approved',
      'withdrawal_processed',
      'salary_payment',
      'market_update',
    ],
    index: true,
  })
  message_type: string;

  @Prop({
    default: 'sent',
    enum: ['sent', 'delivered', 'failed'],
    index: true,
  })
  status: string;

  @Prop()
  message_id?: string; // From Africa's Talking

  @Prop()
  cost?: number; // SMS cost in kobo

  @Prop()
  failure_reason?: string;

  @Prop({ index: true })
  sent_at: Date;

  @Prop()
  delivered_at?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  user_id?: MongooseSchema.Types.ObjectId;

  @Prop({ enum: ['farmer', 'buyer'] })
  user_type?: string;
}

export const SMSLogSchema = SchemaFactory.createForClass(SMSLog);

// Compound Indexes
SMSLogSchema.index({ recipient_phone: 1, sent_at: -1 });
SMSLogSchema.index({ message_type: 1, status: 1 });
SMSLogSchema.index({ sent_at: -1 });
SMSLogSchema.index({ user_id: 1, sent_at: -1 });

// Set sent_at timestamp
SMSLogSchema.pre('save', function (next) {
  if (!this.sent_at) {
    this.sent_at = new Date();
  }
  next();
});
