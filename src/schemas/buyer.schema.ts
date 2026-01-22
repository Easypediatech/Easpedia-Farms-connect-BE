import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BuyerDocument = Buyer & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Buyer {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  business_name: string;

  @Prop({ required: true, index: true })
  lga: string;

  @Prop({
    required: true,
    enum: ['processor', 'aggregator', 'trader', 'exporter'],
    index: true,
  })
  buyer_type: string;

  @Prop({ default: 0 })
  total_purchases: number;

  @Prop({ default: 0 })
  total_spent: number; // in kobo

  @Prop({ default: 0 })
  completed_orders: number;

  @Prop({ default: 0, min: 0, max: 5 })
  average_rating: number;

  @Prop({ default: 0 })
  total_ratings: number;

  // Virtual for full name
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

export const BuyerSchema = SchemaFactory.createForClass(Buyer);

// Indexes
BuyerSchema.index({ createdAt: -1 });

// Virtual for full_name
BuyerSchema.virtual('full_name').get(function () {
  return `${this.first_name} ${this.last_name}`;
});

// Ensure virtuals are included in JSON
BuyerSchema.set('toJSON', { virtuals: true });
BuyerSchema.set('toObject', { virtuals: true });
