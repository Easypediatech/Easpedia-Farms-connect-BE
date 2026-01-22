import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AdminDocument = Admin &
  Document & {
    _id: Types.ObjectId;
  };

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string; // Hashed password

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop()
  phone?: string; // Optional phone number

  @Prop({
    required: true,
    enum: ['super_admin', 'support', 'verifier', 'finance'],
    index: true,
  })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  last_login: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin' })
  created_by?: MongooseSchema.Types.ObjectId;

  // Virtual for full name
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Virtual for full_name
AdminSchema.virtual('full_name').get(function () {
  return `${this.first_name} ${this.last_name}`;
});

// Ensure virtuals are included in JSON
AdminSchema.set('toJSON', { virtuals: true });
AdminSchema.set('toObject', { virtuals: true });
