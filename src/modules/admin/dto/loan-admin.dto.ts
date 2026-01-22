import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

export class GetLoansDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by farmer name or loan reference',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by loan status',
    enum: ['requested', 'approved', 'active', 'completed', 'defaulted'],
  })
  @IsOptional()
  @IsEnum(['requested', 'approved', 'active', 'completed', 'defaulted'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'due_date', 'principal_amount', 'farmer_name'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'due_date', 'principal_amount', 'farmer_name'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

export class AdminApproveLoanRequestDto {
  @ApiPropertyOptional({
    description: "Percentage of staff's monthly salary to debit",
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  salaryDebitPercent?: number;
  @ApiProperty({
    description: 'Date farmer should pick up inputs (ISO 8601)',
    example: '2025-12-01T10:00:00.000Z',
  })
  @IsDateString()
  pickup_date: string;

  @ApiPropertyOptional({ description: 'Pickup location details' })
  @IsOptional()
  @IsString()
  pickup_location?: string;

  @ApiPropertyOptional({ description: 'Admin notes for the farmer' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class AdminLoanKPIsDto {
  @ApiProperty({ description: 'Total number of loan requests' })
  totalLoanRequests: number;

  @ApiProperty({ description: 'Number of pending loan requests' })
  pendingRequests: number;

  @ApiProperty({ description: 'Number of approved loans' })
  approvedLoans: number;

  @ApiProperty({ description: 'Number of active loans' })
  activeLoans: number;

  @ApiProperty({ description: 'Number of completed loans' })
  completedLoans: number;

  @ApiProperty({ description: 'Number of defaulted loans' })
  defaultedLoans: number;

  @ApiProperty({ description: 'Total amount outstanding in kobo' })
  totalOutstanding: number;

  @ApiProperty({ description: 'Total amount disbursed in kobo' })
  totalDisbursed: number;

  @ApiProperty({ description: 'Default rate as percentage' })
  defaultRate: number;
}

export class AdminLoanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'User ID (farmer or staff)' })
  user_id: string;

  @ApiProperty({ description: 'User type: farmer or staff' })
  user_type: 'farmer' | 'staff';

  @ApiProperty({ description: 'Applicant name' })
  name: string;

  @ApiProperty({ description: 'Applicant phone number' })
  phone: string;

  @ApiProperty()
  loan_type_name: string;

  @ApiProperty({ description: 'Principal amount in naira' })
  principal_amount: number;

  @ApiProperty({ description: 'Interest rate percentage' })
  interest_rate: number;

  @ApiProperty({ description: 'Interest amount in naira' })
  interest_amount: number;

  @ApiProperty({ description: 'Total repayment amount in naira' })
  total_repayment: number;

  @ApiProperty()
  purpose: string;

  @ApiProperty()
  duration_months: number;

  @ApiProperty({ description: 'Monthly payment in naira' })
  monthly_payment: number;

  @ApiProperty({ description: 'Amount paid in naira' })
  amount_paid: number;

  @ApiProperty({ description: 'Amount outstanding in naira' })
  amount_outstanding: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  reference: string;

  @ApiProperty({ required: false })
  pickup_date?: Date;

  @ApiProperty({ required: false })
  pickup_location?: string;

  @ApiProperty({ required: false })
  approved_at?: Date;

  @ApiProperty({ required: false })
  disbursed_at?: Date;

  @ApiProperty()
  due_date: Date;

  @ApiProperty({ required: false })
  completed_at?: Date;

  @ApiProperty({ required: false })
  defaulted_at?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    description?: string;
  }>;
}
