import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PayrollDocument = Payroll & Document;

@Schema({ timestamps: true })
export class Payroll {
  @Prop({ required: true })
  period_start: Date; // Start of payroll period

  @Prop({ required: true })
  period_end: Date; // End of payroll period

  @Prop({ required: true, unique: true })
  period_label: string; // e.g., "December 2025", "2025-12"

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Prop({ required: true, default: 0 })
  total_staff_count: number; // Number of active staff in this payroll

  @Prop({ required: true, default: 0 })
  processed_count: number; // Number of staff processed

  @Prop({ required: true, default: 0 })
  failed_count: number; // Number of failed payments

  @Prop({ required: true, default: 0 })
  total_gross_amount: number; // Total gross salary in kobo

  @Prop({ required: true, default: 0 })
  total_net_amount: number; // Total net pay after deductions in kobo

  @Prop({ required: true, default: 0 })
  total_pension_employee: number; // Total employee pension contribution (8%) in kobo

  @Prop({ required: true, default: 0 })
  total_pension_employer: number; // Total employer pension contribution (10%) in kobo

  @Prop({ required: true, default: 0 })
  total_tax_deducted: number; // Total tax deducted (PAYE) in kobo

  @Prop({ required: true, default: 0 })
  total_other_deductions: number; // Other deductions in kobo

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Admin',
  })
  initiated_by?: MongooseSchema.Types.ObjectId; // Admin who initiated manual payroll

  @Prop({ default: false })
  is_automated: boolean; // Was this payroll automated or manual?

  @Prop()
  processed_at?: Date; // When payroll processing completed

  @Prop()
  failed_reason?: string; // Reason for failure if status is 'failed'

  @Prop({ type: [String], default: [] })
  error_logs: string[]; // Array of error messages during processing

  @Prop()
  notes?: string; // Admin notes
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);

// Indexes
PayrollSchema.index({ status: 1 });
PayrollSchema.index({ period_start: 1, period_end: 1 });
PayrollSchema.index({ createdAt: -1 });
