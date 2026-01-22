import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NetworkTrafficDto {
  @ApiProperty({ description: 'Network operator name' })
  @IsString()
  network: string;

  @ApiProperty({ description: 'Number of sessions for this network' })
  @IsNumber()
  sessions: number;

  @ApiProperty({ description: 'Percentage of total sessions' })
  @IsNumber()
  percentage: number;
}

export class SessionStatusDto {
  @ApiProperty({
    description: 'Session status',
    enum: ['active', 'completed', 'terminated', 'failed'],
  })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Count of sessions with this status' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Percentage of total sessions' })
  @IsNumber()
  percentage: number;
}

export class TopActionDto {
  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Number of times this action was performed' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Percentage of total actions' })
  @IsNumber()
  percentage: number;
}

export class RecentSessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Masked phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Network operator' })
  @IsString()
  network: string;

  @ApiProperty({ description: 'Session status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Action performed', required: false })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiProperty({ description: 'Session start time' })
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: 'Session duration in seconds', required: false })
  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class UssdAnalyticsResponseDto {
  @ApiProperty({ description: 'Total number of sessions' })
  @IsNumber()
  totalSessions: number;

  @ApiProperty({ description: 'Success rate percentage' })
  @IsNumber()
  successRate: number;

  @ApiProperty({ description: 'Average session duration in seconds' })
  @IsNumber()
  avgDuration: number;

  @ApiProperty({ description: 'Number of failed sessions' })
  @IsNumber()
  failedSessions: number;

  @ApiProperty({ description: 'Number of currently active sessions' })
  @IsNumber()
  activeSessions: number;

  @ApiProperty({
    description: 'Traffic breakdown by network operator',
    type: [NetworkTrafficDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetworkTrafficDto)
  networkTraffic: NetworkTrafficDto[];

  @ApiProperty({
    description: 'Session status breakdown',
    type: [SessionStatusDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStatusDto)
  sessionStatus: SessionStatusDto[];

  @ApiProperty({
    description: 'Top actions performed',
    type: [TopActionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopActionDto)
  topActions: TopActionDto[];

  @ApiProperty({
    description: 'Recent USSD sessions',
    type: [RecentSessionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentSessionDto)
  recentSessions: RecentSessionDto[];

  @ApiProperty({ description: 'Timestamp when analytics were refreshed' })
  @IsDate()
  refreshedAt: Date;
}

export class AnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for analytics range (ISO string)',
    required: false,
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date for analytics range (ISO string)',
    required: false,
    example: '2026-01-31T23:59:59Z',
  })
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Predefined time range',
    required: false,
    enum: ['realtime', 'today', 'week', 'month'],
    example: 'today',
  })
  @IsOptional()
  timeRange?: 'realtime' | 'today' | 'week' | 'month';
}
