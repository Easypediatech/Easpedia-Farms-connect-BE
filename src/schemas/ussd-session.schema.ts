import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UssdSessionDocument = UssdSession & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    },
  },
})
export class UssdSession {
  @Prop({ required: true, unique: true })
  session_id: string;

  @Prop({ required: true })
  phone_number: string;

  @Prop({
    required: true,
    // enum: ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'UNKNOWN'],
  })
  network_provider: string;

  @Prop({
    required: true,
    enum: ['active', 'completed', 'terminated', 'failed'],
    default: 'active',
  })
  status: string;

  @Prop({ required: true, default: Date.now })
  start_time: Date;

  @Prop()
  end_time?: Date;

  @Prop()
  duration?: number; // in seconds

  @Prop({ default: 0 })
  step_count: number;

  @Prop({ default: 'main_menu' })
  last_menu: string;

  @Prop()
  action?: string; // e.g., 'check_balance', 'create_listing', 'apply_loan'

  @Prop()
  error_message?: string;

  @Prop({ type: Object })
  session_data?: Record<string, any>; // Store session state

  @Prop()
  user_id?: string; // Reference to farmer/buyer if identified
}

export const UssdSessionSchema = SchemaFactory.createForClass(UssdSession);

// Indexes for performance
UssdSessionSchema.index({ phone_number: 1 });
UssdSessionSchema.index({ network_provider: 1 });
UssdSessionSchema.index({ status: 1 });
UssdSessionSchema.index({ start_time: -1 });
UssdSessionSchema.index({ created_at: -1 });
