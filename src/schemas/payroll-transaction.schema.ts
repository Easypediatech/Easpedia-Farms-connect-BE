import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PayrollTransactionDocument = PayrollTransaction & Document;

@Schema({ timestamps: true })
export class PayrollTransaction {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Payroll',
    required: true,
    index: true,
  })
  payroll_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true,
  })
  staff_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  employee_id: string; // Staff employee ID for easy reference

  @Prop({ required: true })
  staff_name: string; // Full name of staff

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  gross_salary: number; // Gross monthly salary in kobo

  @Prop({ required: true, default: 0 })
  pension_employee_contribution: number; // 8% of gross (in kobo)

  @Prop({ required: true, default: 0 })
  pension_employer_contribution: number; // 10% of gross (in kobo)

  @Prop({ required: true, default: 0 })
  total_pension_contribution: number; // employee + employer (in kobo)

  @Prop({ default: 0 })
  tax_deduction: number; // PAYE tax in kobo

  @Prop({ default: 0 })
  other_deductions: number; // Other deductions in kobo

  @Prop()
  deduction_notes?: string; // Notes about other deductions

  @Prop({ required: true })
  total_deductions: number; // Sum of all deductions (in kobo)

  @Prop({ required: true })
  net_salary: number; // Amount after taxes and deductions (in kobo)

  @Prop({ default: 0 })
  savings_deduction: number; // Amount deducted for savings (in kobo)

  @Prop({ required: true })
  credited_salary: number; // Final amount credited to staff wallet (in kobo)

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Prop()
  payment_reference?: string; // Transaction reference

  @Prop()
  paid_at?: Date; // When payment was successful

  @Prop()
  failed_reason?: string; // Reason for failure

  @Prop({ default: 0 })
  retry_count: number; // Number of retry attempts

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Wallet',
  })
  staff_wallet_id?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Wallet',
  })
  organization_wallet_id?: MongooseSchema.Types.ObjectId;

  @Prop()
  notes?: string;
}

export const PayrollTransactionSchema =
  SchemaFactory.createForClass(PayrollTransaction);

// Indexes
PayrollTransactionSchema.index({ payroll_id: 1, staff_id: 1 });
PayrollTransactionSchema.index({ status: 1 });
PayrollTransactionSchema.index({ employee_id: 1 });
PayrollTransactionSchema.index({ createdAt: -1 });
