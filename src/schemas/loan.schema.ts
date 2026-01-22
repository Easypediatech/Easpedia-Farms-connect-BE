// src/schemas/loan.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LoanDocument = Loan &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type LoanItem = {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description?: string;
};

@Schema({ timestamps: true })
export class Loan {
  // Optional link to a Farmer (kept for backward compatibility)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Farmer',
    index: true,
  })
  farmer_id?: MongooseSchema.Types.ObjectId;

  // Optional link to Staff (for staff-personal-loans)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Staff',
    index: true,
  })
  staff_id?: MongooseSchema.Types.ObjectId;

  // Optional link to the User who owns / requested the loan (useful for staff loans)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  user_id?: MongooseSchema.Types.ObjectId;

  // Loan type reference (required) — e.g., InputCredit, StaffPersonalLoan, etc.
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'LoanType',
    required: true,
    index: true,
  })
  loan_type_id: MongooseSchema.Types.ObjectId;

  // Human readable name for the loan type — can be filled by service before saving
  @Prop()
  loan_type_name?: string; // e.g., "Input Credit (Fertilizer/Stems)" or "Staff Personal Loan"

  // Farmer fields are optional (staff loans won't set these)
  @Prop()
  farmer_name?: string;

  @Prop()
  farmer_phone?: string;

  // Staff fields are optional (farmer loans won't set these)
  @Prop()
  staff_name?: string;

  @Prop()
  staff_phone?: string;

  // Principal amount (in kobo)
  @Prop({ required: true })
  principal_amount: number;

  // interest rate in percent, e.g., 10, 15
  @Prop({ required: true })
  interest_rate: number;

  // interest amount in kobo (calculated)
  @Prop()
  interest_amount?: number;

  // total repayment in kobo (principal + interest) (calculated)
  @Prop()
  total_repayment?: number;

  // purpose of loan
  @Prop({ required: true })
  purpose: string;

  // items array
  @Prop({ type: [Object], default: [] })
  items: LoanItem[]; // items in this loan (fertilizer, tools, etc.)

  // duration months (3,6,9,12)
  @Prop({ required: true, enum: [3, 6, 9, 12] })
  duration_months: number;

  // monthly payment (in kobo) — will be auto-calculated in pre-validate if not provided
  @Prop({ required: true })
  monthly_payment: number;

  // amount paid so far (in kobo)
  @Prop({ default: 0 })
  amount_paid: number;

  // amount outstanding (in kobo) — will be set in pre-validate / pre-save
  @Prop({ required: true })
  amount_outstanding: number;

  @Prop({
    default: 'requested',
    enum: ['requested', 'approved', 'active', 'completed', 'defaulted'],
    index: true,
  })
  status: string;

  // unique reference like LOAN20251123001 or SLOAN20251123001
  @Prop({ required: true, unique: true, index: true })
  reference: string;

  // pickup details (optional)
  @Prop()
  pickup_date?: Date;

  @Prop()
  pickup_location?: string;

  @Prop()
  approved_at?: Date;

  @Prop()
  disbursed_at?: Date;

  // due date (required) — set automatically if not provided
  @Prop({ required: true, index: true })
  due_date: Date;

  @Prop()
  completed_at?: Date;

  @Prop()
  defaulted_at?: Date;

  @Prop()
  last_payment_date?: Date;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);

/**
 * Indexes
 */
LoanSchema.index({ farmer_id: 1, status: 1 });
LoanSchema.index({ staff_id: 1, status: 1 });
LoanSchema.index({ user_id: 1, status: 1 });
LoanSchema.index({ status: 1, due_date: 1 });

/**
 * Pre-validate hook: calculate interest, totals, monthly payment, amount outstanding, due date, etc.
 * Runs before mongoose validation so required fields that can be computed are populated.
 */
LoanSchema.pre('validate', function (next) {
  // `this` here is a mongoose document
  // guard: only on new documents
  if (this.isNew) {
    // Ensure principal and interest_rate exist
    if (
      typeof this.principal_amount === 'number' &&
      typeof this.interest_rate === 'number'
    ) {
      // Calculate interest amount (rounded)
      this.interest_amount = Math.round(
        (this.principal_amount * this.interest_rate) / 100,
      );

      // Calculate total repayment
      this.total_repayment = this.principal_amount + this.interest_amount;
    }

    // Calculate monthly payment if not provided and duration is valid
    if (
      (!this.monthly_payment || this.monthly_payment === 0) &&
      this.total_repayment &&
      this.duration_months
    ) {
      const months = Number(this.duration_months) || 1;
      if (months > 0) {
        this.monthly_payment = Math.round(this.total_repayment / months);
      }
    }

    // Set amount outstanding to total_repayment if available
    if (typeof this.total_repayment === 'number') {
      this.amount_outstanding = this.total_repayment;
    } else if (typeof this.amount_outstanding !== 'number') {
      // fallback to principal_amount if total not computed yet
      this.amount_outstanding = this.principal_amount || 0;
    }

    // Set disbursed_at only if status indicates active/approved and not set
    if (
      !this.disbursed_at &&
      (this.status === 'active' || this.status === 'approved')
    ) {
      this.disbursed_at = new Date();
    }

    // Set due_date if not provided using duration_months
    if (!this.due_date && this.duration_months) {
      const dueDate = new Date();
      // Use integer months; if duration_months is not numeric, skip
      const monthsToAdd = Number(this.duration_months);
      if (!Number.isNaN(monthsToAdd) && monthsToAdd > 0) {
        dueDate.setMonth(dueDate.getMonth() + monthsToAdd);
        this.due_date = dueDate;
      }
    }
  }

  next();
});

/**
 * Pre-save hook: update amount_outstanding when amount_paid changes, mark completed when paid off.
 */
LoanSchema.pre('save', function (next) {
  // If amount_paid was modified, recompute outstanding and maybe mark completed
  if (
    this.isModified &&
    typeof this.isModified === 'function' &&
    this.isModified('amount_paid')
  ) {
    // Ensure total_repayment exists
    if (typeof this.total_repayment === 'number') {
      this.amount_outstanding = this.total_repayment - (this.amount_paid || 0);
    } else {
      // Fallback: subtract from principal
      this.amount_outstanding =
        (this.principal_amount || 0) - (this.amount_paid || 0);
    }

    // If fully paid or outstanding <= 0, mark completed
    if (this.amount_outstanding <= 0) {
      this.status = 'completed';
      if (!this.completed_at) {
        this.completed_at = new Date();
      }
    }

    // update last_payment_date
    this.last_payment_date = new Date();
  }

  next();
});
