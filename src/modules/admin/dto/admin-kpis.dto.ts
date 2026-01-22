import { ApiProperty } from '@nestjs/swagger';

export class PickupRequestsKpiDto {
  @ApiProperty({
    description: 'Total number of scheduled pickups',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Pickups scheduled for today',
    example: 12,
  })
  today: number;

  @ApiProperty({
    description: 'Pickups scheduled for this week',
    example: 28,
  })
  this_week: number;

  @ApiProperty({
    description: 'Pickups currently in transit',
    example: 8,
  })
  in_transit: number;

  @ApiProperty({
    description: 'Overdue pickups (past scheduled date)',
    example: 3,
  })
  overdue: number;
}

export class ChallengesKpiDto {
  @ApiProperty({
    description: 'Total number of reports',
    example: 23,
  })
  total_reports: number;

  @ApiProperty({
    description: 'Pending reports',
    example: 8,
  })
  pending_reports: number;

  @ApiProperty({
    description: 'Reports under investigation',
    example: 5,
  })
  investigating_reports: number;

  @ApiProperty({
    description: 'Total number of disputes',
    example: 15,
  })
  total_disputes: number;

  @ApiProperty({
    description: 'Open disputes',
    example: 4,
  })
  open_disputes: number;

  @ApiProperty({
    description: 'Disputes under review',
    example: 3,
  })
  under_review_disputes: number;

  @ApiProperty({
    description: 'Urgent priority issues',
    example: 2,
  })
  urgent_issues: number;

  @ApiProperty({
    description: 'High priority issues',
    example: 6,
  })
  high_priority_issues: number;
}

export class BuyersKpiDto {
  @ApiProperty({
    description: 'Total number of registered buyers',
    example: 156,
  })
  total: number;

  @ApiProperty({
    description: 'Active buyers (made purchase in last 30 days)',
    example: 89,
  })
  active: number;

  @ApiProperty({
    description: 'New buyers registered this month',
    example: 12,
  })
  new_this_month: number;

  @ApiProperty({
    description: 'Buyers by type breakdown',
    example: {
      processor: 45,
      aggregator: 67,
      trader: 32,
      exporter: 12,
    },
  })
  by_type: {
    processor: number;
    aggregator: number;
    trader: number;
    exporter: number;
  };

  @ApiProperty({
    description: 'Top 5 buyers by purchase volume (kg)',
    example: [
      { name: 'ABC Processors', total_kg: 15000 },
      { name: 'XYZ Aggregators', total_kg: 12500 },
    ],
  })
  top_buyers: Array<{ name: string; total_kg: number }>;
}

export class FarmersKpiDto {
  @ApiProperty({
    description: 'Total number of registered farmers',
    example: 543,
  })
  total: number;

  @ApiProperty({
    description: 'Active farmers (created listing in last 30 days)',
    example: 234,
  })
  active: number;

  @ApiProperty({
    description: 'New farmers registered this month',
    example: 45,
  })
  new_this_month: number;

  @ApiProperty({
    description: 'Farmers with active listings',
    example: 156,
  })
  with_active_listings: number;

  @ApiProperty({
    description: 'Farmers with active loans',
    example: 78,
  })
  with_active_loans: number;

  @ApiProperty({
    description: 'Average credit score',
    example: 585,
  })
  avg_credit_score: number;
}

export class FieldAgentsKpiDto {
  @ApiProperty({
    description: 'Total number of field agents/support staff',
    example: 12,
  })
  total: number;

  @ApiProperty({
    description: 'Active agents (logged in last 7 days)',
    example: 10,
  })
  active: number;

  @ApiProperty({
    description: 'Agents by role',
    example: {
      support: 5,
      verifier: 4,
      finance: 3,
    },
  })
  by_role: {
    support: number;
    verifier: number;
    finance: number;
  };

  @ApiProperty({
    description: 'Total reports assigned',
    example: 23,
  })
  total_assigned_reports: number;
}

export class OrdersKpiDto {
  @ApiProperty({
    description: 'Total number of orders',
    example: 1234,
  })
  total: number;

  @ApiProperty({
    description: 'Orders this month',
    example: 156,
  })
  this_month: number;

  @ApiProperty({
    description: 'Orders today',
    example: 12,
  })
  today: number;

  @ApiProperty({
    description: 'Pending orders',
    example: 45,
  })
  pending: number;

  @ApiProperty({
    description: 'Accepted orders',
    example: 32,
  })
  accepted: number;

  @ApiProperty({
    description: 'In transit orders',
    example: 18,
  })
  in_transit: number;

  @ApiProperty({
    description: 'Completed orders',
    example: 1098,
  })
  completed: number;

  @ApiProperty({
    description: 'Cancelled orders',
    example: 23,
  })
  cancelled: number;

  @ApiProperty({
    description: 'Disputed orders',
    example: 8,
  })
  disputed: number;

  @ApiProperty({
    description: 'Total volume traded in kg',
    example: 567890,
  })
  total_volume_kg: number;

  @ApiProperty({
    description: 'Average order value in naira',
    example: 125000,
  })
  avg_order_value: number;
}

export class FinancialKpiDto {
  @ApiProperty({
    description: 'Total transaction volume in naira',
    example: 45000000,
  })
  total_transaction_volume: number;

  @ApiProperty({
    description: 'Total platform fees collected in naira',
    example: 450000,
  })
  total_platform_fees: number;

  @ApiProperty({
    description: 'Transaction volume this month in naira',
    example: 5600000,
  })
  volume_this_month: number;

  @ApiProperty({
    description: 'Total wallet balances in naira',
    example: 12340000,
  })
  total_wallet_balance: number;

  @ApiProperty({
    description: 'Total escrow balance in naira',
    example: 1234000,
  })
  total_escrow_balance: number;

  @ApiProperty({
    description: 'Total savings balance in naira',
    example: 2345000,
  })
  total_savings_balance: number;

  @ApiProperty({
    description: 'Active loans count',
    example: 78,
  })
  active_loans_count: number;

  @ApiProperty({
    description: 'Total active loans value in naira',
    example: 8900000,
  })
  active_loans_value: number;

  @ApiProperty({
    description: 'Loan default rate percentage',
    example: 2.5,
  })
  loan_default_rate: number;

  @ApiProperty({
    description: 'Total withdrawals this month in naira',
    example: 3400000,
  })
  withdrawals_this_month: number;
}

export class ListingsKpiDto {
  @ApiProperty({
    description: 'Total number of listings',
    example: 456,
  })
  total: number;

  @ApiProperty({
    description: 'Active listings',
    example: 234,
  })
  active: number;

  @ApiProperty({
    description: 'Listings created today',
    example: 23,
  })
  created_today: number;

  @ApiProperty({
    description: 'Listings created this week',
    example: 67,
  })
  created_this_week: number;

  @ApiProperty({
    description: 'Expired listings',
    example: 45,
  })
  expired: number;

  @ApiProperty({
    description: 'Sold listings',
    example: 167,
  })
  sold: number;

  @ApiProperty({
    description: 'Average views per listing',
    example: 12.5,
  })
  avg_views_per_listing: number;

  @ApiProperty({
    description: 'Listings by variety',
    example: {
      'TME 419': 120,
      'TME 348': 67,
      'UMUCASS 36': 47,
    },
  })
  by_variety: Record<string, number>;
}

export class AdminKpisResponseDto {
  @ApiProperty({
    description: 'Pickup requests KPIs',
    type: PickupRequestsKpiDto,
  })
  pickup_requests: PickupRequestsKpiDto;

  @ApiProperty({
    description: 'Challenges and issues KPIs',
    type: ChallengesKpiDto,
  })
  challenges: ChallengesKpiDto;

  @ApiProperty({
    description: 'Buyers (travel agencies) KPIs',
    type: BuyersKpiDto,
  })
  buyers: BuyersKpiDto;

  @ApiProperty({
    description: 'Farmers (tenants) KPIs',
    type: FarmersKpiDto,
  })
  farmers: FarmersKpiDto;

  @ApiProperty({
    description: 'Field agents KPIs',
    type: FieldAgentsKpiDto,
  })
  field_agents: FieldAgentsKpiDto;

  @ApiProperty({
    description: 'Orders KPIs',
    type: OrdersKpiDto,
  })
  orders: OrdersKpiDto;

  @ApiProperty({
    description: 'Financial KPIs',
    type: FinancialKpiDto,
  })
  financial: FinancialKpiDto;

  @ApiProperty({
    description: 'Listings KPIs',
    type: ListingsKpiDto,
  })
  listings: ListingsKpiDto;

  @ApiProperty({
    description: 'Timestamp when KPIs were generated',
    example: '2025-11-25T10:30:00.000Z',
  })
  generated_at: Date;
}
