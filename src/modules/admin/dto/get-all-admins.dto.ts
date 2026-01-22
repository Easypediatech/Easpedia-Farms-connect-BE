import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdminRole } from './create-admin.dto';

export class GetAllAdminsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of admins per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Search by email or name',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    enum: AdminRole,
    example: AdminRole.SUPPORT,
    description: 'Filter by admin role',
  })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Filter by admin status (active, inactive)',
    enum: ['active', 'inactive', 'all'],
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'all' = 'all';
}
