import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SupplierNetworkDocument = SupplierNetwork & Document;

@Schema({ timestamps: true })
export class SupplierNetwork {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Buyer',
    required: true,
    index: true,
  })
  buyer_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  })
  farmer_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  buyer_name: string;

  @Prop({ required: true })
  farmer_name: string;

  @Prop({ default: 0 })
  total_orders: number;

  @Prop({ default: 0 })
  total_volume_kg: number;

  @Prop({ default: 0 })
  total_value: number; // in kobo

  @Prop({ min: 0, max: 5 })
  avg_rating?: number;

  @Prop()
  last_order_date?: Date;

  @Prop({ default: false })
  standing_order_active: boolean;

  @Prop({
    type: {
      frequency: String,
      quantity_kg: Number,
      variety: String,
      quality: String,
      max_price_per_kg: Number,
    },
  })
  standing_order_details?: {
    frequency: string;
    quantity_kg: number;
    variety: string;
    quality: string;
    max_price_per_kg: number;
  };
}

export const SupplierNetworkSchema =
  SchemaFactory.createForClass(SupplierNetwork);

// Compound Unique Index
SupplierNetworkSchema.index({ buyer_id: 1, farmer_id: 1 }, { unique: true });

// Additional Indexes
SupplierNetworkSchema.index({ buyer_id: 1, total_orders: -1 });
SupplierNetworkSchema.index({ standing_order_active: 1 });
