import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { UssdService } from './ussd.service';
import { UssdAnalyticsService } from './ussd-analytics.service';
import {
  UssdAnalyticsResponseDto,
  AnalyticsQueryDto,
} from './dto/ussd-analytics.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

export class UssdRequestDto {
  @ApiProperty({ description: 'USSD session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'USSD text input' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Service code used', required: false })
  @IsString()
  @IsOptional()
  serviceCode?: string;

  @ApiProperty({ description: 'Network code', required: false })
  @IsString()
  @IsOptional()
  networkCode?: string;
}

@ApiTags('USSD')
@Controller('ussd')
export class UssdController {
  private readonly logger = new Logger(UssdController.name);

  constructor(
    private readonly ussdService: UssdService,
    private readonly ussdAnalyticsService: UssdAnalyticsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'USSD webhook endpoint',
    description: "Handle USSD requests from Africa's Talking",
  })
  @ApiResponse({
    status: 200,
    description: 'USSD response (CON or END)',
    type: String,
  })
  async handleUssd(@Body() request: UssdRequestDto): Promise<string> {
    this.logger.log(`USSD Request: ${JSON.stringify(request)}`);

    try {
      // Call USSD service directly - the service handles its own timeouts
      const response = await this.ussdService.handleUssd(request);
      this.logger.log(`USSD Response sent for session: ${request.sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `USSD request error for session ${request.sessionId}: ${error.message}`,
      );
      return 'END An error occurred\n\nPlease try again later';
    }
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get USSD Analytics and KPIs',
    description:
      'Retrieve comprehensive USSD analytics including session metrics, network traffic, and performance data',
  })
  @ApiResponse({
    status: 200,
    description: 'USSD analytics data',
    type: UssdAnalyticsResponseDto,
  })
  async getAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<UssdAnalyticsResponseDto> {
    this.logger.log('Fetching USSD analytics...');

    try {
      let analytics;

      // Handle predefined time ranges
      if (query.timeRange) {
        switch (query.timeRange) {
          case 'realtime':
            analytics = await this.ussdAnalyticsService.getRealTimeAnalytics();
            break;
          case 'today':
            analytics = await this.ussdAnalyticsService.getDailyAnalytics();
            break;
          case 'week':
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            analytics = await this.ussdAnalyticsService.getUssdAnalytics(
              weekStart,
              new Date(),
            );
            break;
          case 'month':
            const monthStart = new Date();
            monthStart.setDate(monthStart.getDate() - 30);
            analytics = await this.ussdAnalyticsService.getUssdAnalytics(
              monthStart,
              new Date(),
            );
            break;
          default:
            analytics = await this.ussdAnalyticsService.getUssdAnalytics();
        }
      } else {
        // Handle custom date range
        const startDate = query.startDate
          ? new Date(query.startDate)
          : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;
        analytics = await this.ussdAnalyticsService.getUssdAnalytics(
          startDate,
          endDate,
        );
      }

      this.logger.log('Successfully fetched USSD analytics');
      return analytics;
    } catch (error) {
      this.logger.error('Error fetching USSD analytics:', error);
      throw error;
    }
  }

  @Get('analytics/realtime')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Real-time USSD Analytics',
    description: 'Get real-time USSD analytics for the last hour',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time USSD analytics',
    type: UssdAnalyticsResponseDto,
  })
  async getRealTimeAnalytics(): Promise<UssdAnalyticsResponseDto> {
    this.logger.log('Fetching real-time USSD analytics...');

    try {
      const analytics = await this.ussdAnalyticsService.getRealTimeAnalytics();
      return analytics;
    } catch (error) {
      this.logger.error('Error fetching real-time analytics:', error);
      throw error;
    }
  }

  @Get('analytics/today')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get Today's USSD Analytics",
    description: 'Get USSD analytics for the current day',
  })
  @ApiResponse({
    status: 200,
    description: "Today's USSD analytics",
    type: UssdAnalyticsResponseDto,
  })
  async getTodayAnalytics(): Promise<UssdAnalyticsResponseDto> {
    this.logger.log("Fetching today's USSD analytics...");

    try {
      const analytics = await this.ussdAnalyticsService.getDailyAnalytics();
      return analytics;
    } catch (error) {
      this.logger.error("Error fetching today's analytics:", error);
      throw error;
    }
  }
}
