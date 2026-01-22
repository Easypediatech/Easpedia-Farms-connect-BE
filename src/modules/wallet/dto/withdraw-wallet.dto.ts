import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsString,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

export class WithdrawWalletDto {
  @ApiProperty({
    description: 'Amount to withdraw in Naira (will be converted to kobo)',
    example: 5000,
    minimum: 100,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Minimum withdrawal amount is ₦100' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Bank name (required if withdrawing to a different account)',
    example: 'Access Bank',
  })
  @IsOptional()
  @IsString({ message: 'Bank name must be a string' })
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank code (required if withdrawing to a different account)',
    example: '044',
  })
  @IsOptional()
  @IsString({ message: 'Bank code must be a string' })
  bankCode?: string;

  @ApiPropertyOptional({
    description:
      '10-digit account number (required if withdrawing to a different account)',
    example: '0123456789',
  })
  @IsOptional()
  @IsString({ message: 'Account number must be a string' })
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber?: string;

  @ApiPropertyOptional({
    description:
      'Account name (required if withdrawing to a different account)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString({ message: 'Account name must be a string' })
  accountName?: string;
}
