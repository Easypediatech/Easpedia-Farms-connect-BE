import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['farmer', 'buyer'] })
  user_type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: ['offer', 'payment', 'delivery', 'loan', 'system'],
    index: true,
  })
  type: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  action_url?: string; // Deep link or action URL

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;

  @Prop()
  read_at?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound Indexes
NotificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Update read_at when read status changes
NotificationSchema.pre('save', function (next) {
  if (this.isModified('read') && this.read && !this.read_at) {
    this.read_at = new Date();
  }
  next();
});
