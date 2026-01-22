import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoanItemDto {
  @ApiProperty({
    description: 'Name of the item',
    example: 'NPK Fertilizer 50kg bag',
  })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Quantity of units', example: 4 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price in kobo', example: 2500000 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiProperty({ description: 'Total price in kobo', example: 10000000 })
  @IsNumber()
  @Min(0)
  total_price: number;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateLoanDto {
  @ApiProperty({ description: 'Farmer ID (MongoDB ObjectId)' })
  @IsMongoId()
  farmer_id: string;

  @ApiProperty({ description: 'Loan Type ID (MongoDB ObjectId)' })
  @IsMongoId()
  loan_type_id: string;

  @ApiProperty({ description: 'Principal amount in kobo', example: 10000000 })
  @IsNumber()
  @Min(0)
  principal_amount: number;

  @ApiProperty({
    description: 'Array of loan items',
    type: [LoanItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LoanItemDto)
  items: LoanItemDto[];

  @ApiPropertyOptional({ description: 'Purpose/reason for the loan' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({ description: 'Due date for loan repayment (ISO 8601)' })
  @IsDateString()
  due_date: string;

  @ApiPropertyOptional({
    description: 'Custom monthly payment amount in kobo (optional - auto-calculated if not provided)',
    example: 2000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  monthly_payment?: number;

  @ApiPropertyOptional({ description: 'Notes or comments about the loan' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLoanStatusDto {
  @ApiProperty({
    description: 'New loan status',
    enum: ['requested', 'approved', 'active', 'completed', 'defaulted'],
  })
  @IsEnum(['requested', 'approved', 'active', 'completed', 'defaulted'])
  status: string;

  @ApiPropertyOptional({ description: 'Amount paid (in kobo)' })
  @IsOptional()
  @IsNumber()
  amount_paid?: number;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RecordLoanPaymentDto {
  @ApiProperty({ description: 'Payment amount in kobo' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  payment_reference?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Notes about the payment' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveLoanRequestDto {
  @ApiProperty({
    description: 'Date farmer should pick up inputs from factory (ISO 8601)',
    example: '2025-12-01T10:00:00.000Z',
  })
  @IsDateString()
  pickup_date: string;

  @ApiPropertyOptional({ description: 'Admin notes/instructions for farmer' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class CreateLoanRequestDto {
  @ApiProperty({ description: 'Loan Type ID (MongoDB ObjectId)' })
  @IsMongoId()
  loan_type_id: string;

  @ApiPropertyOptional({ description: 'Purpose/reason for the loan request' })
  @IsOptional()
  @IsString()
  purpose?: string;
}
