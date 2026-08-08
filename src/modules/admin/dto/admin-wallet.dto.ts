import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsMongoId,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class AdminFundWalletDto {
  @ApiProperty({
    description: 'User ID (Farmer or Buyer)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'Invalid user ID format' })
  userId: string;

  @ApiProperty({
    description: 'Amount to fund in Naira (will be converted to kobo)',
    example: 5000,
    minimum: 100,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum funding amount is ₦100' })
  amount: number;

  @ApiProperty({
    description: 'Reason for funding',
    example: 'Admin funding for customer support',
  })
  @IsNotEmpty({ message: 'Reason is required' })
  @IsString({ message: 'Reason must be a string' })
  reason: string;
}

export class AdminSetAccountDto {
  @ApiProperty({
    description: 'User ID (Farmer or Buyer)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'Invalid user ID format' })
  userId: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Access Bank',
  })
  @IsNotEmpty({ message: 'Bank name is required' })
  @IsString({ message: 'Bank name must be a string' })
  bankName: string;

  @ApiProperty({
    description: 'Bank code (from Paystack)',
    example: '044',
  })
  @IsNotEmpty({ message: 'Bank code is required' })
  @IsString({ message: 'Bank code must be a string' })
  bankCode: string;

  @ApiProperty({
    description: '10-digit bank account number',
    example: '0123456789',
  })
  @IsNotEmpty({ message: 'Account number is required' })
  @IsString({ message: 'Account number must be a string' })
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'John Doe',
  })
  @IsNotEmpty({ message: 'Account name is required' })
  @IsString({ message: 'Account name must be a string' })
  accountName: string;

  @ApiProperty({
    description: 'Bank Verification Number (optional)',
    example: '12345678901',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'BVN must be a string' })
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'BVN must contain only digits' })
  bvn?: string;
}

export class AdminFundOrganizationWalletDto {
  @ApiProperty({
    description: 'Amount to fund in Naira (will be converted to kobo)',
    example: 100000,
    minimum: 1000,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(1000, { message: 'Minimum funding amount is ₦1,000' })
  amount: number;

  @ApiProperty({
    description: 'Reason for funding the organization wallet (optional)',
    example: 'Monthly salary funding for staff payroll',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}

/** Canonical kinds of pooled organization wallet. */
export enum OrgWalletKindDto {
  PAYROLL = 'payroll',
  BONUS = 'bonus',
  WITHDRAWER = 'withdrawer',
  PURCHASE = 'purchase',
  WITHHOLDING_TAX = 'withholding_tax',
  CHARGES = 'charges',
}
