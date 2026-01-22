import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({ description: 'Farmer ID' })
  @IsString()
  farmerId: string;

  @ApiProperty({ description: 'Farmer phone number' })
  @IsString()
  farmerPhone: string;

  @ApiProperty({ description: 'Weight in kilograms', minimum: 0.1 })
  @IsNumber()
  @Min(0.1)
  weightKg: number;

  @ApiProperty({ description: 'Price per kilogram in kobo' })
  @IsNumber()
  @Min(0)
  pricePerKg: number;

  @ApiProperty({ description: 'Unit of measurement', enum: ['kg', 'ton'] })
  @IsEnum(['kg', 'ton'])
  unit: string;

  @ApiProperty({ description: 'Payment method', enum: ['cash', 'wallet', 'bank_transfer'] })
  @IsEnum(['cash', 'wallet', 'bank_transfer'])
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Purchase location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}