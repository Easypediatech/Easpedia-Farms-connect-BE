import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FarmerDocument = Farmer & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Farmer {
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

  @Prop({ required: true, index: true })
  lga: string;

  @Prop({ required: true })
  farm_size_hectares: number;

  @Prop({ default: 0 })
  total_sales: number;

  @Prop({ default: 0 })
  total_earnings: number; // in kobo

  @Prop({ default: 0 })
  completed_sales: number;

  @Prop({ default: 0 })
  listings_count: number;

  @Prop({ default: 500, min: 300, max: 850, index: true })
  credit_score: number;

  @Prop({ default: 0 })
  loan_defaults: number;

  @Prop({ default: false, index: true })
  active_loan: boolean;

  @Prop({ default: 0, min: 0, max: 5 })
  average_rating: number;

  @Prop({ default: 0 })
  total_ratings: number;

  // Virtual for full name
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

export const FarmerSchema = SchemaFactory.createForClass(Farmer);

// Indexes
FarmerSchema.index({ credit_score: 1, active_loan: 1 });
FarmerSchema.index({ createdAt: -1 });

// Virtual for full_name
FarmerSchema.virtual('full_name').get(function () {
  return `${this.first_name} ${this.last_name}`;
});

// Ensure virtuals are included in JSON
FarmerSchema.set('toJSON', { virtuals: true });
FarmerSchema.set('toObject', { virtuals: true });
