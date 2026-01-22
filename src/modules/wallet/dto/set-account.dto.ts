import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class SetAccountDto {
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

  @ApiPropertyOptional({
    description: 'Bank Verification Number (optional)',
    example: '12345678901',
  })
  @IsOptional()
  @IsString({ message: 'BVN must be a string' })
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'BVN must contain only digits' })
  bvn?: string;
}
