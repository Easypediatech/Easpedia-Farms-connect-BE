import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PriceHistoryDocument = PriceHistory & Document;

@Schema({ timestamps: true })
export class PriceHistory {
  @Prop({ required: true, index: true })
  variety: string;

  @Prop({ required: true, enum: ['premium', 'standard', 'processing'] })
  quality_grade: string;

  @Prop({ required: true })
  price: number; // Price per kg in kobo

  @Prop({ required: true })
  quantity_kg: number;

  @Prop()
  lga?: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order' })
  order_id?: MongooseSchema.Types.ObjectId;
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);

// Compound Indexes
PriceHistorySchema.index({ variety: 1, date: -1 });
PriceHistorySchema.index({ date: -1 });

// Set date to current date if not provided
PriceHistorySchema.pre('save', function (next) {
  if (!this.date) {
    this.date = new Date();
  }
  next();
});
