import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class BuyerDetailDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Buyer unique ID',
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
    example: 'Jane',
    description: 'Buyer first name',
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    example: 'Smith',
    description: 'Buyer last name',
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    example: 'Jane Smith',
    description: 'Buyer full name',
  })
  @Expose()
  fullName: string;

  @ApiProperty({
    example: '08087654321',
    description: 'Buyer phone number',
  })
  @Expose()
  phone: string;

  @ApiProperty({
    example: 'Smith Cassava Processors Ltd',
    description: 'Business name',
  })
  @Expose()
  businessName: string;

  @ApiProperty({
    example: 'Oshodi-Isolo',
    description: 'Local Government Area',
  })
  @Expose()
  lga: string;

  @ApiProperty({
    example: 'processor',
    description: 'Type of buyer',
    enum: ['processor', 'aggregator', 'trader', 'exporter'],
  })
  @Expose()
  buyerType: string;

  @ApiProperty({
    example: 85,
    description: 'Total number of purchases',
  })
  @Expose()
  totalPurchases: number;

  @ApiProperty({
    example: 12000000,
    description: 'Total amount spent in kobo',
  })
  @Expose()
  totalSpent: number;

  @ApiProperty({
    example: 80,
    description: 'Number of completed orders',
  })
  @Expose()
  completedOrders: number;

  @ApiProperty({
    example: 4.7,
    description: 'Average rating (0-5)',
  })
  @Expose()
  averageRating: number;

  @ApiProperty({
    example: 65,
    description: 'Total number of ratings received',
  })
  @Expose()
  totalRatings: number;

  @ApiProperty({
    example: 'active',
    description: 'User account status',
  })
  @Expose()
  status: string;

  @ApiProperty({
    example: '2024-02-10T14:20:00.000Z',
    description: 'Account creation date',
  })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    example: '2024-11-26T09:45:00.000Z',
    description: 'Last update date',
  })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
