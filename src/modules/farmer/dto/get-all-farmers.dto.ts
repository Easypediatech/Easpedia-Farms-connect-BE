import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, IsString, IsIn } from 'class-validator';

export class GetAllFarmersDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by name or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'suspended', 'banned'],
  })
  @IsOptional()
  @IsIn(['active', 'suspended', 'banned'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by LGA' })
  @IsOptional()
  @IsString()
  lga?: string;
}
