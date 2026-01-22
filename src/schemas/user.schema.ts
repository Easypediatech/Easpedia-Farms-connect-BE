import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ default: '234' })
  phone_code: string;

  @Prop({ required: true })
  password: string; // Hashed 4-digit PIN

  @Prop({ required: true, enum: ['farmer', 'buyer', 'staff'], index: true })
  user_type: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Farmer', index: true })
  farmer_profile_id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Buyer', index: true })
  buyer_profile_id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Staff', index: true })
  staff_profile_id?: MongooseSchema.Types.ObjectId;

  @Prop({ default: 'menu' })
  ussd_stage: string;

  @Prop()
  ussd_token: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  ussd_listing_draft?: Record<string, any>;

  @Prop()
  last_login: Date;

  @Prop()
  last_activity: Date;

  @Prop({
    default: 'active',
    enum: ['active', 'suspended', 'banned'],
    index: true,
  })
  status: string;

  // Virtual for full phone number
  get full_phone(): string {
    return `+${this.phone_code}${this.phone}`;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash PIN before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare PIN
UserSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update last_activity on any change
UserSchema.pre('save', function (next) {
  this.last_activity = new Date();
  next();
});
