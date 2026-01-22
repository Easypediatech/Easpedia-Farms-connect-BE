import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User type (farmer/buyer)' })
  userType: string;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Transaction amount in naira' })
  amount: number;

  @ApiProperty({ description: 'Balance before transaction in naira' })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after transaction in naira' })
  balanceAfter: number;

  @ApiProperty({ description: 'Transaction status' })
  status: string;

  @ApiProperty({ description: 'Transaction reference' })
  reference: string;

  @ApiProperty({ description: 'Transaction description' })
  description: string;

  @ApiProperty({ description: 'Order ID if applicable' })
  orderId?: string;

  @ApiProperty({ description: 'Loan ID if applicable' })
  loanId?: string;

  @ApiProperty({ description: 'User details (farmer/buyer info)' })
  user?: {
    id: string;
    name: string;
    phone: string;
    type: 'farmer' | 'buyer';
    lga?: string;
    farmSize?: number;
    businessName?: string;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Completion timestamp' })
  completedAt?: Date;
}