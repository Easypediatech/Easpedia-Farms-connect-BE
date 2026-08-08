import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const PAYOUT_STATUS_FILTERS = [
  'pending',
  'processing',
  'retrying',
  'completed',
  'failed',
  'manual_review',
  'all',
] as const;

const PAYOUT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'amount',
  'status',
  'processed_at',
] as const;

/** Pagination, filtering, and sort controls for the withdrawer payout list. */
export class WithdrawerPayoutFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: PAYOUT_STATUS_FILTERS })
  @IsOptional()
  @IsEnum(PAYOUT_STATUS_FILTERS)
  status?: (typeof PAYOUT_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Search by reference, user, or account' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: PAYOUT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsEnum(PAYOUT_SORT_FIELDS)
  sortBy?: (typeof PAYOUT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
