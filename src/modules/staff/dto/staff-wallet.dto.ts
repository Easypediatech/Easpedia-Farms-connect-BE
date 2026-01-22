import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class StaffSetAccountDto {
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

export class StaffWithdrawDto {
  @ApiProperty({
    description: 'Amount to withdraw in Naira (will be converted to kobo)',
    example: 5000,
    minimum: 100,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum withdrawal amount is ₦100' })
  amount: number;

  @ApiProperty({
    description: 'PIN for verification',
    example: '1234',
  })
  @IsNotEmpty({ message: 'PIN is required' })
  @IsString({ message: 'PIN must be a string' })
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;

  // Optional bank details for withdrawing to different account
  @ApiProperty({
    description: 'Bank name (optional, for different account)',
    example: 'Access Bank',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Bank name must be a string' })
  bankName?: string;

  @ApiProperty({
    description: 'Bank code (optional, from Paystack)',
    example: '044',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Bank code must be a string' })
  bankCode?: string;

  @ApiProperty({
    description: '10-digit bank account number (optional)',
    example: '0123456789',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Account number must be a string' })
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber?: string;

  @ApiProperty({
    description: 'Account holder name (optional)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Account name must be a string' })
  accountName?: string;
}
