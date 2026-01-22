import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ProductDocument = Product & Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Product {
    @Prop({ required: true, unique: true, index: true })
    product_name: string;

    @Prop({ required: true, min: 0 }) // Stored in kobo (smallest unit)
    price_for_farmers: number;

    @Prop({ required: true, min: 0 }) // Stored in kobo (smallest unit)
    price_for_market: number;

    @Prop({ required: true })
    size: string;

    @Prop({ default: true, index: true })
    is_active: boolean;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin' })
    created_by?: MongooseSchema.Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Include virtuals if needed
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });
