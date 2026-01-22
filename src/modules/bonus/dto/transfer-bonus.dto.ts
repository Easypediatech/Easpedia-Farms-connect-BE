import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsOptional, IsMongoId } from 'class-validator';

export class TransferBonusDto {
  @ApiProperty({
    description: 'Staff user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Staff ID is required' })
  @IsMongoId({ message: 'Invalid staff ID format' })
  staffId: string;

  @ApiProperty({
    description: 'Amount to transfer in Naira (optional - if not provided, transfers all bonus balance)',
    example: 2500,
    minimum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum transfer amount is ₦100' })
  amount?: number;
}