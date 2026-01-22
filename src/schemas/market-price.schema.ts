import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketPriceDocument = MarketPrice & Document;

@Schema({ timestamps: true })
export class MarketPrice {
  @Prop({ required: true, index: true })
  variety: string;

  @Prop({
    required: true,
    enum: ['premium', 'standard', 'processing'],
    index: true,
  })
  quality_grade: string;

  @Prop({ required: true })
  avg_price: number; // in kobo

  @Prop({ required: true })
  min_price: number; // in kobo

  @Prop({ required: true })
  max_price: number; // in kobo

  @Prop({ required: true })
  sample_size: number; // Number of orders used

  @Prop({ index: true })
  lga?: string; // Optional location-specific pricing

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ enum: ['rising', 'falling', 'stable'] })
  trend?: string;

  @Prop()
  percentage_change?: number;
}

export const MarketPriceSchema = SchemaFactory.createForClass(MarketPrice);

// Compound Indexes
MarketPriceSchema.index({ variety: 1, quality_grade: 1, date: -1 });
MarketPriceSchema.index({ date: -1 });
MarketPriceSchema.index({ lga: 1, variety: 1, date: -1 });

// Set date to current date if not provided
MarketPriceSchema.pre('save', function (next) {
  if (!this.date) {
    this.date = new Date();
  }
  next();
});
