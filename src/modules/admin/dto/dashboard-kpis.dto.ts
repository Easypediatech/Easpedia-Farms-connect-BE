import { ApiProperty } from '@nestjs/swagger';
import { AdminLoanKPIsDto } from './loan-admin.dto';

export class TransactionKPIsDto {
  @ApiProperty({ description: 'Total transactions count' })
  totalTransactions: number;

  @ApiProperty({ description: 'Total transaction value in kobo' })
  totalValue: number;

  @ApiProperty({ description: 'Successful transactions count' })
  successfulTransactions: number;

  @ApiProperty({ description: 'Failed transactions count' })
  failedTransactions: number;

  @ApiProperty({ description: 'Pending transactions count' })
  pendingTransactions: number;

  @ApiProperty({ description: "Today's transactions count" })
  todayTransactions: number;

  @ApiProperty({ description: "Today's transaction value in kobo" })
  todayValue: number;

  @ApiProperty({ description: 'Monthly growth percentage' })
  monthlyGrowth: number;
}

export class FarmerKPIsDto {
  @ApiProperty({ description: 'Total registered farmers' })
  totalFarmers: number;

  @ApiProperty({ description: 'Active farmers (logged in last 30 days)' })
  activeFarmers: number;

  @ApiProperty({ description: 'Verified farmers' })
  verifiedFarmers: number;

  @ApiProperty({ description: 'Farmers with active listings' })
  farmersWithListings: number;

  @ApiProperty({ description: 'New farmers this month' })
  newFarmersThisMonth: number;

  @ApiProperty({ description: 'Farmers by state distribution' })
  farmersByState: { state: string; count: number }[];

  @ApiProperty({ description: 'Average farmer rating' })
  averageRating: number;
}

export class PurchaseKPIsDto {
  @ApiProperty({ description: 'Total purchases count' })
  totalPurchases: number;

  @ApiProperty({ description: 'Total cassava volume in kg' })
  totalVolumeKg: number;

  @ApiProperty({ description: 'Total purchase value in kobo' })
  totalValue: number;

  @ApiProperty({ description: 'Average price per kg in kobo' })
  averagePricePerKg: number;

  @ApiProperty({ description: 'Completed purchases' })
  completedPurchases: number;

  @ApiProperty({ description: "Today's purchases count" })
  todayPurchases: number;

  @ApiProperty({ description: "This week's purchases count" })
  weeklyPurchases: number;

  @ApiProperty({ description: 'Monthly purchases trend' })
  monthlyTrend: { month: string; count: number; value: number }[];
}

export class UssdSessionDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'User phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Network provider' })
  networkProvider: string;

  @ApiProperty({ description: 'Session status' })
  status: 'active' | 'completed' | 'terminated' | 'failed';

  @ApiProperty({ description: 'Session start time' })
  startTime: Date;

  @ApiProperty({ description: 'Session end time' })
  endTime?: Date;

  @ApiProperty({ description: 'Session duration in seconds' })
  duration?: number;

  @ApiProperty({ description: 'Number of menu steps' })
  stepCount: number;

  @ApiProperty({ description: 'Last menu accessed' })
  lastMenu: string;

  @ApiProperty({ description: 'Action performed' })
  action?: string;

  @ApiProperty({ description: 'Error message if failed' })
  errorMessage?: string;
}

export class UssdKPIsDto {
  @ApiProperty({ description: 'Total USSD sessions today' })
  totalSessionsToday: number;

  @ApiProperty({ description: 'Total USSD sessions this week' })
  totalSessionsWeek: number;

  @ApiProperty({ description: 'Total USSD sessions this month' })
  totalSessionsMonth: number;

  @ApiProperty({ description: 'Successful sessions count' })
  successfulSessions: number;

  @ApiProperty({ description: 'Failed sessions count' })
  failedSessions: number;

  @ApiProperty({ description: 'Average session duration in seconds' })
  averageDuration: number;

  @ApiProperty({ description: 'Sessions by network provider' })
  sessionsByNetwork: { network: string; count: number; percentage: number }[];

  @ApiProperty({ description: 'Most accessed menu items' })
  popularMenus: { menu: string; count: number }[];

  @ApiProperty({ description: 'Recent sessions', type: [UssdSessionDto] })
  recentSessions: UssdSessionDto[];

  @ApiProperty({ description: 'Hourly session distribution for today' })
  hourlyDistribution: { hour: number; count: number }[];
}

export class DashboardKPIsDto {
  @ApiProperty({ description: 'Transaction metrics', type: TransactionKPIsDto })
  transactions: TransactionKPIsDto;

  @ApiProperty({ description: 'Farmer metrics', type: FarmerKPIsDto })
  farmers: FarmerKPIsDto;

  @ApiProperty({ description: 'Purchase metrics', type: PurchaseKPIsDto })
  purchases: PurchaseKPIsDto;

  @ApiProperty({ description: 'Loan metrics', type: AdminLoanKPIsDto })
  loans: AdminLoanKPIsDto;

  @ApiProperty({ description: 'USSD metrics', type: UssdKPIsDto })
  ussd: UssdKPIsDto;

  @ApiProperty({ description: 'Data generation timestamp' })
  generatedAt: Date;

  @ApiProperty({ description: 'System health status' })
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
  };
}
