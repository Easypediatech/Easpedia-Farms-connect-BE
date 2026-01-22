import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LoanCategory } from './create-loan-type.dto';

export class GetAllLoansDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by loan status',
    enum: ['active', 'completed', 'defaulted'],
  })
  @IsOptional()
  @IsEnum(['active', 'completed', 'defaulted'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by loan type category' })
  @IsOptional()
  @IsEnum(LoanCategory, {
    message: `category must be one of the following values: ${Object.values(LoanCategory).join(', ')}`,
  })
  category?: LoanCategory;

  @ApiPropertyOptional({ description: 'Filter by farmer ID' })
  @IsOptional()
  farmer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by staff ID' })
  @IsOptional()
  staff_id?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'due_date', 'amount_outstanding', 'principal_amount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'due_date', 'amount_outstanding', 'principal_amount'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({
    description: 'Filter loans due before this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  due_before?: string;

  @ApiPropertyOptional({
    description: 'Filter loans created after this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  created_after?: string;
}
