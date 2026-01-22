import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StaffDocument = Staff &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({ timestamps: true })
export class Staff {
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
  role: string; // e.g., 'field_officer', 'manager', 'supervisor', 'admin_staff'

  @Prop({ required: false })
  department?: string; // e.g., 'operations', 'finance', 'logistics'

  @Prop({ required: false })
  employee_id?: string; // Unique employee identification number

  @Prop({ default: false, index: true })
  is_active: boolean; // Whether staff is approved and active

  @Prop({ default: false, index: true })
  is_approved: boolean; // Whether staff registration is approved

  @Prop({ type: Date })
  date_of_hire?: Date;

  @Prop({ type: Date })
  date_approved?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin' })
  approved_by?: MongooseSchema.Types.ObjectId;

  @Prop({ default: 0 })
  monthly_salary: number; // in kobo

  @Prop({ default: 0 })
  total_salary_paid: number; // Lifetime salary payments in kobo

  @Prop({ default: 0 })
  pension_contributions: number; // Total pension contributions in kobo

  @Prop({ default: 0, min: 0, max: 5 })
  performance_rating: number;

  @Prop({ default: 0 })
  total_ratings: number;

  @Prop()
  deactivation_reason?: string;

  @Prop({ type: Date })
  deactivated_at?: Date;

  @Prop({ required: false, length: 11 })
  bvn?: string; // Bank Verification Number (11 digits)

  @Prop({ required: false })
  nin?: string; // National Identification Number (Cloudinary URL)

  // Virtual for full name
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

// Indexes
StaffSchema.index({ is_active: 1, is_approved: 1 });
StaffSchema.index({ role: 1 });
StaffSchema.index({ department: 1 });
StaffSchema.index({ employee_id: 1 }, { unique: true, sparse: true });
StaffSchema.index({ createdAt: -1 });

// Virtual for full_name
StaffSchema.virtual('full_name').get(function () {
  return `${this.first_name} ${this.last_name}`;
});

// Ensure virtuals are included in JSON
StaffSchema.set('toJSON', { virtuals: true });
StaffSchema.set('toObject', { virtuals: true });
