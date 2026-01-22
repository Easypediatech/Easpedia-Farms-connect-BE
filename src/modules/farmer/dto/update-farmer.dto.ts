import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateFarmerDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Local Government Area' })
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiPropertyOptional({ description: 'Farm size in hectares', minimum: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  farmSize?: number;
}
