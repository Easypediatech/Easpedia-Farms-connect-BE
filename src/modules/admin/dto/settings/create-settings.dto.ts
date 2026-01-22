import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettingsDto {
  @ApiPropertyOptional({
    description: 'Payroll tax rate as a percentage (e.g., 7.5 for 7.5%)',
    example: 7.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tax rate must be a valid number' })
  @Min(0, { message: 'Tax rate must be greater than or equal to 0' })
  @Max(100, { message: 'Tax rate must be less than or equal to 100' })
  taxRate?: number; // as percentage, defaults to 0.0

  @ApiPropertyOptional({
    description: 'Price per kilogram for cassava in kobo',
    example: 50000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cassavaPricePerKg?: number; // in kobo, defaults to 50000 (500 naira)

  @ApiPropertyOptional({
    description: 'Price per ton for cassava bulk purchases in kobo',
    example: 45000000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cassavaPricePerTon?: number; // in kobo, defaults to 45000000 (450,000 naira)
}
