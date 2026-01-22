import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoanTypeItemResponseDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  unit_price: number;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  total_price: number;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;
}

export class LoanTypeResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  interest_rate: number;

  @ApiProperty()
  @Expose()
  duration_months: number;

  @ApiProperty()
  @Expose()
  is_active: boolean;

  @ApiProperty()
  @Expose()
  times_issued: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class LoanResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  reference: string;

  @ApiProperty()
  @Expose()
  farmer_id: string;

  @ApiProperty()
  @Expose()
  farmer_name: string;

  @ApiProperty()
  @Expose()
  farmer_phone: string;

  @ApiProperty()
  @Expose()
  loan_type_id: string;

  @ApiProperty()
  @Expose()
  loan_type_name: string;

  @ApiProperty()
  @Expose()
  principal_amount: number;

  @ApiProperty()
  @Expose()
  interest_rate: number;

  @ApiProperty()
  @Expose()
  interest_amount: number;

  @ApiProperty()
  @Expose()
  total_repayment: number;

  @ApiProperty()
  @Expose()
  purpose: string;

  @ApiProperty({ type: [LoanTypeItemResponseDto], required: false })
  @Expose()
  items?: LoanTypeItemResponseDto[];

  @ApiProperty()
  @Expose()
  duration_months: number;

  @ApiProperty()
  @Expose()
  monthly_payment: number;

  @ApiProperty()
  @Expose()
  amount_paid: number;

  @ApiProperty()
  @Expose()
  amount_outstanding: number;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty({ required: false })
  @Expose()
  pickup_date?: Date;

  @ApiProperty({ required: false })
  @Expose()
  approved_at?: Date;

  @ApiProperty({ required: false })
  @Expose()
  disbursed_at?: Date;

  @ApiProperty()
  @Expose()
  due_date: Date;

  @ApiProperty({ required: false })
  @Expose()
  completed_at?: Date;

  @ApiProperty({ required: false })
  @Expose()
  defaulted_at?: Date;

  @ApiProperty({ required: false })
  @Expose()
  last_payment_date?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class LoanKPIsDto {
  @ApiProperty({ description: 'Total number of active loans' })
  @Expose()
  total_active_loans: number;

  @ApiProperty({ description: 'Total number of completed loans' })
  @Expose()
  total_completed_loans: number;

  @ApiProperty({ description: 'Total number of defaulted loans' })
  @Expose()
  total_defaulted_loans: number;

  @ApiProperty({
    description: 'Total outstanding amount across all loans (in kobo)',
  })
  @Expose()
  total_outstanding_amount: number;

  @ApiProperty({ description: 'Total principal disbursed (in kobo)' })
  @Expose()
  total_principal_disbursed: number;

  @ApiProperty({ description: 'Total amount repaid (in kobo)' })
  @Expose()
  total_amount_repaid: number;

  @ApiProperty({ description: 'Total interest earned (in kobo)' })
  @Expose()
  total_interest_earned: number;

  @ApiProperty({ description: 'Average loan size (in kobo)' })
  @Expose()
  average_loan_size: number;

  @ApiProperty({ description: 'Default rate percentage' })
  @Expose()
  default_rate: number;

  @ApiProperty({ description: 'Number of loans due in next 30 days' })
  @Expose()
  loans_due_in_30_days: number;

  @ApiProperty({ description: 'Number of overdue loans' })
  @Expose()
  overdue_loans: number;
}
