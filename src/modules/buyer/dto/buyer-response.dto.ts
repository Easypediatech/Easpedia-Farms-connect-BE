import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BuyerResponseDto {
  @ApiProperty({ description: 'Buyer ID' })
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @ApiProperty({ description: 'User ID reference' })
  @Expose()
  @Transform(({ obj }) => obj.user_id?.toString())
  userId: string;

  @ApiProperty({ description: 'First name' })
  @Expose()
  @Transform(({ obj }) => obj.first_name)
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @Expose()
  @Transform(({ obj }) => obj.last_name)
  lastName: string;

  @ApiProperty({ description: 'Full name' })
  @Expose()
  @Transform(({ obj }) => obj.full_name ?? `${obj.first_name} ${obj.last_name}`)
  fullName: string;

  @ApiProperty({ description: 'Business name' })
  @Expose()
  @Transform(({ obj }) => obj.business_name)
  businessName: string;

  @ApiProperty({ description: 'Local Government Area' })
  @Expose()
  lga: string;

  @ApiProperty({ description: 'Buyer type' })
  @Expose()
  @Transform(({ obj }) => obj.buyer_type)
  buyerType: string;

  @ApiProperty({ description: 'Total purchases count' })
  @Expose()
  @Transform(({ obj }) => obj.total_purchases ?? 0)
  totalPurchases: number;

  @ApiProperty({ description: 'Total spent in kobo' })
  @Expose()
  @Transform(({ obj }) => obj.total_spent ?? 0)
  totalSpent: number;

  @ApiProperty({ description: 'Completed orders count' })
  @Expose()
  @Transform(({ obj }) => obj.completed_orders ?? 0)
  completedOrders: number;

  @ApiProperty({ description: 'Average rating (0-5)' })
  @Expose()
  @Transform(({ obj }) => obj.average_rating ?? 0)
  averageRating: number;

  @ApiProperty({ description: 'Total ratings count' })
  @Expose()
  @Transform(({ obj }) => obj.total_ratings ?? 0)
  totalRatings: number;

  @ApiProperty({ description: 'Phone number' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Phone country code' })
  @Expose()
  @Transform(({ obj }) => obj.phone_code ?? '234')
  phoneCode: string;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;
}
