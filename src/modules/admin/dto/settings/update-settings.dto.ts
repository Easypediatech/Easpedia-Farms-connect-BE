import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Payroll tax rate as a percentage (e.g., 7.5 for 7.5%)',
    example: 7.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tax rate must be a valid number' })
  @Min(0, { message: 'Tax rate must be greater than or equal to 0' })
  taxRate?: number; // as percentage

  @ApiPropertyOptional({
    description: 'Price per kilogram for cassava in naira',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cassava price per kg must be a valid number' })
  @Min(0, {
    message: 'Cassava price per kg must be greater than or equal to 0',
  })
  cassavaPricePerKg?: number; // in naira

  @ApiPropertyOptional({
    description: 'Price per ton for cassava bulk purchases in naira',
    example: 450000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cassava price per ton must be a valid number' })
  @Min(0, {
    message: 'Cassava price per ton must be greater than or equal to 0',
  })
  cassavaPricePerTon?: number; // in naira
}
