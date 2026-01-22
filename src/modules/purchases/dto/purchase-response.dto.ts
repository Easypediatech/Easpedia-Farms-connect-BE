import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseResponseDto {
  @ApiProperty({ description: 'Purchase ID' })
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @ApiProperty({ description: 'Farmer ID' })
  @Expose()
  farmerId: string;

  @ApiProperty({ description: 'Farmer name' })
  @Expose()
  farmerName: string;

  @ApiProperty({ description: 'Farmer phone' })
  @Expose()
  farmerPhone: string;

  @ApiProperty({ description: 'Weight in kg' })
  @Expose()
  weightKg: number;

  @ApiProperty({ description: 'Price per kg in kobo' })
  @Expose()
  @Transform(({ obj }) => Math.round(obj.pricePerKg / 100)) // Convert from kobo to naira
  pricePerKg: number;

  @ApiProperty({ description: 'Total amount in naira' })
  @Expose()
  @Transform(({ obj }) => Math.round(obj.totalAmount / 100)) // Convert from kobo to naira
  totalAmount: number;

  @ApiProperty({ description: 'Unit (kg or ton)' })
  @Expose()
  unit: string;

  @ApiProperty({ description: 'Payment method' })
  @Expose()
  paymentMethod: string;

  @ApiProperty({ description: 'Purchase status' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Payment status' })
  @Expose()
  paymentStatus: string;

  @ApiProperty({ description: 'Recorded by' })
  @Expose()
  recordedBy: string;

  @ApiProperty({ description: 'Recorded by ID' })
  @Expose()
  recordedById: string;

  @ApiProperty({ description: 'Loan deduction amount in naira' })
  @Expose()
  @Transform(({ obj }) => obj.loanDeductionAmount ? Math.round(obj.loanDeductionAmount / 100) : undefined)
  loanDeductionAmount?: number;

  @ApiProperty({ description: 'Loan deduction transaction ID' })
  @Expose()
  loanDeductionTransactionId?: string;

  @ApiProperty({ description: 'Net amount credited in naira' })
  @Expose()
  @Transform(({ obj }) => obj.netAmountCredited ? Math.round(obj.netAmountCredited / 100) : undefined)
  netAmountCredited?: number;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;
}