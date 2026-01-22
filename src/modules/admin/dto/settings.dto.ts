import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class GetSettingsResponseDto {
  @ApiProperty({ description: 'Price per kilogram for cassava' })
  cassavaPricePerKg: number;

  @ApiProperty({ description: 'Price per ton for cassava bulk purchases' })
  cassavaPricePerTon: number;
}