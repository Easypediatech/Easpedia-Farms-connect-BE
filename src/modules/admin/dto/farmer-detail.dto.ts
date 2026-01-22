import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class FarmerDetailDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Farmer unique ID',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Associated user ID',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    example: 'John',
    description: 'Farmer first name',
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Farmer last name',
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Farmer full name',
  })
  @Expose()
  fullName: string;

  @ApiProperty({
    example: '08012345678',
    description: 'Farmer phone number',
  })
  @Expose()
  phone: string;

  @ApiProperty({
    example: 'Oshodi-Isolo',
    description: 'Local Government Area',
  })
  @Expose()
  lga: string;

  @ApiProperty({
    example: 5.5,
    description: 'Farm size in hectares',
  })
  @Expose()
  farmSizeHectares: number;

  @ApiProperty({
    example: 150,
    description: 'Total number of sales',
  })
  @Expose()
  totalSales: number;

  @ApiProperty({
    example: 5000000,
    description: 'Total earnings in kobo',
  })
  @Expose()
  totalEarnings: number;

  @ApiProperty({
    example: 145,
    description: 'Number of completed sales',
  })
  @Expose()
  completedSales: number;

  @ApiProperty({
    example: 0,
    description: 'Number of loan defaults',
  })
  @Expose()
  loanDefaults: number;

  @ApiProperty({
    example: false,
    description: 'Whether farmer has active loan',
  })
  @Expose()
  activeLoan: boolean;

  @ApiProperty({
    example: 50000,
    description: 'Wallet balance in naira',
  })
  @Expose()
  walletBalance: number;

  @ApiProperty({
    example: 'active',
    description: 'User account status',
  })
  @Expose()
  status: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account creation date',
  })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    example: '2024-11-26T08:15:00.000Z',
    description: 'Last update date',
  })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
