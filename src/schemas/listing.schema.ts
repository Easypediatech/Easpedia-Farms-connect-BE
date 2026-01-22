import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ListingDocument = Listing & Document;

@Schema({ timestamps: true })
export class Listing {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  })
  farmer_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  farmer_name: string;

  @Prop({ required: true })
  farmer_phone: string;

  @Prop({
    required: true,
    enum: ['TME 419', 'TME 348', 'TMS 98/0505', 'NR 8082', 'Traditional Local'],
    index: true,
  })
  variety: string;

  @Prop({
    required: true,
    enum: ['premium', 'standard', 'processing'],
    index: true,
  })
  quality_grade: string;

  @Prop({ required: true, min: 100, max: 50000 })
  quantity_kg: number;

  @Prop({ required: true, index: true })
  price_per_kg: number; // in kobo

  @Prop({ required: true })
  total_value: number; // in kobo

  @Prop({
    required: true,
    enum: ['ready_now', '1_week', '2_4_weeks', 'pre_order'],
    index: true,
  })
  harvest_status: string;

  @Prop()
  harvest_date: Date;

  @Prop({ required: true, index: true })
  location_lga: string;

  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
  })
  location_coordinates?: {
    lat: number;
    lng: number;
  };

  @Prop({
    default: 'active',
    enum: ['active', 'pending', 'sold', 'expired'],
    index: true,
  })
  status: string;

  @Prop({ default: 0 })
  views_count: number;

  @Prop({ default: 0 })
  offers_count: number;

  @Prop({ required: true, unique: true, index: true })
  reference: string; // LST20251123001

  @Prop({ index: true })
  expires_at: Date;

  @Prop()
  sold_at: Date;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);

// Compound Indexes for high-frequency queries
ListingSchema.index({ farmer_id: 1, status: 1, createdAt: -1 });
ListingSchema.index({
  location_lga: 1,
  status: 1,
  harvest_status: 1,
  createdAt: -1,
});
ListingSchema.index({ variety: 1, quality_grade: 1, status: 1, createdAt: -1 });
ListingSchema.index({ price_per_kg: 1, status: 1 });
ListingSchema.index({ status: 1, expires_at: 1 });

// Set expiration date before saving (7 days default)
ListingSchema.pre('save', function (next) {
  if (!this.expires_at) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    this.expires_at = expiryDate;
  }

  // Calculate total_value
  if (this.quantity_kg && this.price_per_kg) {
    this.total_value = this.quantity_kg * this.price_per_kg;
  }

  next();
});
