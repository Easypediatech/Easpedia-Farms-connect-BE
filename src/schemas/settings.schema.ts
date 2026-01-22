import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ required: true, default: 0.0 })
  taxRate: number; // Payroll tax rate as a percentage (e.g. 7.5 for 7.5%)
  @Prop({ required: true, default: 50000 }) // 500 naira in kobo
  cassavaPricePerKg: number; // in kobo

  @Prop({ required: true, default: 45000000 }) // 450,000 naira in kobo
  cassavaPricePerTon: number; // in kobo

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;

  @Prop()
  updatedBy?: string; // Admin ID who updated settings

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

// MongoDB automatically creates a unique index on _id, so no custom index needed
