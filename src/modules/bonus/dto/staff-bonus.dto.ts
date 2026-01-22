import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsOptional, IsString, IsMongoId } from 'class-validator';

export class StaffBonusDto {
  @ApiProperty({
    description: 'Staff user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Staff ID is required' })
  @IsMongoId({ message: 'Invalid staff ID format' })
  staffId: string;

  @ApiProperty({
    description: 'Bonus amount in Naira (will be converted to kobo)',
    example: 5000,
    minimum: 100,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum bonus amount is ₦100' })
  amount: number;

  @ApiProperty({
    description: 'Reason for bonus (optional)',
    example: 'Performance bonus for Q4 2025',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}