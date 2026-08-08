import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Optional reporting-window filters for the withdrawer KPI summary. */
export class WithdrawerKpiFilterDto {
  @ApiPropertyOptional({ description: 'Start date filter (ISO)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
