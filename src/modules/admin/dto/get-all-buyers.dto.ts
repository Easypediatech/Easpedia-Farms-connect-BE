import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';

export class GetAllBuyersDto {
  @ApiProperty({
    example: 1,
    description: 'Page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Number of items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    example: 'Oshodi-Isolo',
    description: 'Filter by Local Government Area',
    required: false,
  })
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiProperty({
    example: 'processor',
    description: 'Filter by buyer type',
    required: false,
    enum: ['processor', 'aggregator', 'trader', 'exporter'],
  })
  @IsOptional()
  @IsIn(['processor', 'aggregator', 'trader', 'exporter'])
  buyerType?: string;

  @ApiProperty({
    example: 'active',
    description: 'Filter by user status',
    required: false,
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiProperty({
    example: 'total_purchases',
    description: 'Sort by field',
    required: false,
    enum: ['total_purchases', 'total_spent', 'average_rating', 'createdAt'],
  })
  @IsOptional()
  @IsIn(['total_purchases', 'total_spent', 'average_rating', 'createdAt'])
  sortBy?: string;

  @ApiProperty({
    example: 'desc',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
