import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePayrollDto {
  @ApiProperty({
    description: 'Start date of payroll period',
    example: '2025-12-01',
  })
  @IsNotEmpty()
  @IsDateString()
  period_start: string;

  @ApiProperty({
    description: 'End date of payroll period',
    example: '2025-12-31',
  })
  @IsNotEmpty()
  @IsDateString()
  period_end: string;

  @ApiProperty({
    description: 'Optional notes about this payroll',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
