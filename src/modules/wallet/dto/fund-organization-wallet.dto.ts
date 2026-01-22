import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FundOrganizationWalletDto {
  @ApiProperty({
    description: 'Amount to fund in kobo',
    example: 5000000, // 50,000 NGN
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum funding amount is ₦1' }) // 100 kobo = 1 NGN
  amount: number;

  @ApiProperty({
    description: 'Reason for funding',
    example: 'Topping up for January payroll',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}
