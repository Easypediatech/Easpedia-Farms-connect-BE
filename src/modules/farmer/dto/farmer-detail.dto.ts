import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FarmerDetailDto {
  @ApiProperty({ description: 'Farmer ID' })
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

  @ApiProperty({ description: 'Phone number' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Phone country code' })
  @Expose()
  @Transform(({ obj }) => obj.phone_code ?? '234')
  phoneCode: string;

  @ApiProperty({ description: 'User status' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Local Government Area' })
  @Expose()
  lga: string;

  @ApiProperty({ description: 'Farm size in hectares' })
  @Expose()
  @Transform(({ obj }) => obj.farm_size_hectares)
  farmSize: number;

  @ApiProperty({ description: 'Total sales count' })
  @Expose()
  @Transform(({ obj }) => obj.total_sales ?? 0)
  totalSales: number;

  @ApiProperty({ description: 'Total earnings in kobo' })
  @Expose()
  @Transform(({ obj }) => obj.total_earnings ?? 0)
  totalEarnings: number;

  @ApiProperty({ description: 'Completed sales count' })
  @Expose()
  @Transform(({ obj }) => obj.completed_sales ?? 0)
  completedSales: number;

  @ApiProperty({ description: 'Active listings count' })
  @Expose()
  @Transform(({ obj }) => obj.listings_count ?? 0)
  listingsCount: number;

  @ApiProperty({ description: 'Credit score (300-850)' })
  @Expose()
  @Transform(({ obj }) => obj.credit_score ?? 500)
  creditScore: number;

  @ApiProperty({ description: 'Has active loan' })
  @Expose()
  @Transform(({ obj }) => obj.active_loan ?? false)
  activeLoan: boolean;

  @ApiProperty({ description: 'Average rating (0-5)' })
  @Expose()
  @Transform(({ obj }) => obj.average_rating ?? 0)
  averageRating: number;

  @ApiProperty({ description: 'Total ratings count' })
  @Expose()
  @Transform(({ obj }) => obj.total_ratings ?? 0)
  totalRatings: number;

  @ApiProperty({ description: 'Wallet balance in kobo' })
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }: { obj: any }) => (obj.wallet_balance as number) ?? 0)
  walletBalance: number;

  @ApiProperty({ description: 'Last login timestamp' })
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }: { obj: any }) => obj.last_login as Date)
  lastLogin: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }: { obj: any }) => obj.last_activity as Date)
  lastActivity: Date;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;
}
