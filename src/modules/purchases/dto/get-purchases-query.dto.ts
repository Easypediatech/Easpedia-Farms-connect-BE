import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetPurchasesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(String(value));
    return isNaN(num) ? 1 : num;
  })
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(String(value));
    return isNaN(num) ? 20 : num;
  })
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Payment status filter' })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed'])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by farmer ID' })
  @IsOptional()
  @IsString()
  farmerId?: string;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;
}

export class PurchaseKPIsDto {
  @ApiProperty({ description: 'Total weight in kg' })
  totalWeightKg: number;

  @ApiProperty({ description: 'Total amount paid' })
  totalAmountPaid: number;

  @ApiProperty({ description: 'Average price per kg' })
  avgPricePerKg: number;

  @ApiProperty({ description: 'Number of active farmers' })
  activeFarmers: number;
}