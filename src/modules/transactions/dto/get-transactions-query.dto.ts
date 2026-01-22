import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Transaction type',
    enum: [
      'sale',
      'purchase', 
      'withdrawal',
      'deposit',
      'loan_disbursement',
      'loan_repayment',
      'savings_deposit',
      'savings_withdrawal',
      'escrow_hold',
      'escrow_release'
    ]
  })
  @IsOptional()
  @IsEnum([
    'sale',
    'purchase',
    'withdrawal', 
    'deposit',
    'loan_disbursement',
    'loan_repayment',
    'savings_deposit',
    'savings_withdrawal',
    'escrow_hold',
    'escrow_release'
  ])
  type?: string;

  @ApiPropertyOptional({ 
    description: 'Transaction status',
    enum: ['pending', 'completed', 'failed', 'cancelled']
  })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ 
    description: 'User type',
    enum: ['farmer', 'buyer']
  })
  @IsOptional()
  @IsEnum(['farmer', 'buyer'])
  userType?: string;

  @ApiPropertyOptional({ description: 'Search by reference or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'User ID to filter by' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'amount', 'status', 'type'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'amount', 'status', 'type'])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;
}