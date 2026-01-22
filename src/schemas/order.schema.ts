import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true,
  })
  listing_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  })
  farmer_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Buyer',
    required: true,
    index: true,
  })
  buyer_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  quantity_kg: number;

  @Prop({ required: true })
  price_per_kg: number; // in kobo

  @Prop({ required: true })
  total_amount: number; // in kobo

  @Prop({ default: 0 })
  platform_fee: number; // in kobo (1%)

  @Prop({ required: true })
  grand_total: number; // in kobo

  @Prop()
  pickup_date: Date;

  @Prop()
  pickup_time: string;

  @Prop({
    required: true,
    enum: ['wallet', 'bank_transfer', 'mobile_money', 'cash'],
  })
  payment_method: string;

  @Prop({
    default: 'pending',
    enum: [
      'pending',
      'accepted',
      'rejected',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'disputed',
    ],
    index: true,
  })
  status: string;

  @Prop({ default: false })
  farmer_confirmed: boolean;

  @Prop({ default: false })
  buyer_confirmed: boolean;

  @Prop({ min: 1, max: 5 })
  farmer_rating?: number;

  @Prop({ min: 1, max: 5 })
  buyer_rating?: number;

  @Prop()
  farmer_review?: string;

  @Prop()
  buyer_review?: string;

  @Prop({ required: true, unique: true })
  reference: string; // ORD20251123001

  @Prop()
  accepted_at: Date;

  @Prop()
  delivered_at: Date;

  @Prop({ index: true })
  completed_at: Date;

  @Prop()
  disputed_at: Date;

  @Prop()
  cancelled_at: Date;

  @Prop()
  cancellation_reason?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Compound Indexes
OrderSchema.index({ farmer_id: 1, status: 1, createdAt: -1 });
OrderSchema.index({ buyer_id: 1, status: 1, createdAt: -1 });
OrderSchema.index({ listing_id: 1, status: 1 });
OrderSchema.index({ status: 1, completed_at: -1 });

// Calculate platform fee and grand total before saving
OrderSchema.pre('save', function (next) {
  if (this.total_amount && !this.platform_fee) {
    // 1% platform fee
    this.platform_fee = Math.round(this.total_amount * 0.01);
  }

  if (this.total_amount && this.platform_fee) {
    this.grand_total = this.total_amount + this.platform_fee;
  }

  next();
});

// Update timestamp fields based on status changes
OrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'accepted':
        if (!this.accepted_at) this.accepted_at = now;
        break;
      case 'delivered':
        if (!this.delivered_at) this.delivered_at = now;
        break;
      case 'completed':
        if (!this.completed_at) this.completed_at = now;
        break;
      case 'disputed':
        if (!this.disputed_at) this.disputed_at = now;
        break;
      case 'cancelled':
        if (!this.cancelled_at) this.cancelled_at = now;
        break;
    }
  }

  next();
});
