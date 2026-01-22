import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';

export class FundWalletDto {
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
