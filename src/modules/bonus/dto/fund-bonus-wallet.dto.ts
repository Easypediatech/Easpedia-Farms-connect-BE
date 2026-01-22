import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class FundBonusWalletDto {
  @ApiProperty({
    description: 'Amount to fund in Naira (will be converted to kobo)',
    example: 50000,
    minimum: 1000,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(1000, { message: 'Minimum funding amount is ₦1,000' })
  amount: number;

  @ApiProperty({
    description: 'Reason for funding the bonus wallet (optional)',
    example: 'Quarterly bonus fund allocation',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}