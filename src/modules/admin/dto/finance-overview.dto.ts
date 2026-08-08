import { ApiProperty } from '@nestjs/swagger';
import { OrgWalletKindDto } from './admin-wallet.dto';

export type FinanceMetricUnit = 'count' | 'naira' | 'percent' | 'naira_per_session';

export class FinanceMetricDto {
  @ApiProperty({ example: 'Cost per USSD Session (₦)' })
  metric: string;

  @ApiProperty({ example: 6 })
  value: number;

  @ApiProperty({
    enum: ['count', 'naira', 'percent', 'naira_per_session'],
    example: 'naira',
  })
  unit: FinanceMetricUnit;
}

export class OrgWalletBalanceDto {
  @ApiProperty({
    enum: OrgWalletKindDto,
    example: OrgWalletKindDto.PAYROLL,
  })
  walletType: OrgWalletKindDto;

  @ApiProperty({ example: 'Organization Payroll Wallet' })
  walletName: string;

  @ApiProperty({ example: 250000 })
  balance: number;

  @ApiProperty({ example: 1500000 })
  totalDeposited: number;

  @ApiProperty({ example: 250000 })
  totalWithdrawn: number;

  @ApiProperty({ example: true })
  exists: boolean;
}

export class FinanceOverviewDto {
  @ApiProperty({ example: 'Feb 1, 2026 - Feb 14, 2026' })
  period: string;

  @ApiProperty({ type: [OrgWalletBalanceDto] })
  wallets: OrgWalletBalanceDto[];

  @ApiProperty({ type: [FinanceMetricDto] })
  operationalMetrics: FinanceMetricDto[];

  @ApiProperty({ type: [FinanceMetricDto] })
  engagementMetrics: FinanceMetricDto[];

  @ApiProperty({
    example: {
      totalFarmers: 1250,
      totalStaff: 83,
      totalActiveFarmers: 460,
      totalOrganizationWalletBalance: 4200000,
    },
  })
  summary: {
    totalFarmers: number;
    totalStaff: number;
    totalActiveFarmers: number;
    totalOrganizationWalletBalance: number;
  };

  @ApiProperty({ example: '2026-02-14T12:00:00.000Z' })
  generatedAt: Date;
}
