import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FarmInputsOrderDocument = FarmInputsOrder & Document;

@Schema({ timestamps: true })
export class FarmInputsOrder {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  })
  farmer_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  farmer_name: string;

  @Prop({
    required: true,
    enum: [
      'cassava_stems',
      'fertilizer',
      'herbicide',
      'farm_tools',
      'processing_equipment',
    ],
  })
  item_type: string;

  @Prop({ required: true })
  item_name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, enum: ['stems', 'bags', 'liters', 'pieces'] })
  unit: string;

  @Prop({ required: true })
  unit_price: number; // in kobo

  @Prop({ required: true })
  total_amount: number; // in kobo

  @Prop({
    required: true,
    enum: ['wallet', 'cash', 'credit'],
    index: true,
  })
  payment_type: string;

  @Prop()
  interest_amount?: number; // in kobo

  @Prop()
  total_due?: number; // in kobo

  @Prop({ index: true })
  due_date?: Date;

  @Prop()
  supplier_name?: string;

  @Prop()
  supplier_phone?: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'dispatched', 'delivered', 'completed'],
    index: true,
  })
  delivery_status: string;

  @Prop()
  delivery_address?: string;

  @Prop({ required: true, unique: true })
  reference: string; // INP20251123001

  @Prop()
  delivered_at?: Date;

  @Prop()
  paid_at?: Date;
}

export const FarmInputsOrderSchema =
  SchemaFactory.createForClass(FarmInputsOrder);

// Compound Indexes
FarmInputsOrderSchema.index({ farmer_id: 1, delivery_status: 1 });
FarmInputsOrderSchema.index({ payment_type: 1, due_date: 1 });
FarmInputsOrderSchema.index({ item_type: 1 });

// Calculate total_amount if not provided
FarmInputsOrderSchema.pre('save', function (next) {
  if (!this.total_amount && this.quantity && this.unit_price) {
    this.total_amount = this.quantity * this.unit_price;
  }

  // Calculate total_due for credit purchases
  if (this.payment_type === 'credit' && !this.total_due) {
    const interestRate = 0.1; // 10% interest
    this.interest_amount = Math.round(this.total_amount * interestRate);
    this.total_due = this.total_amount + this.interest_amount;

    // Set due date (3 months default)
    if (!this.due_date) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 3);
      this.due_date = dueDate;
    }
  }

  next();
});
