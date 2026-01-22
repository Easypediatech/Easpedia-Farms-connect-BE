import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('payroll')
export class PayrollController {
  private readonly logger = new Logger(PayrollController.name);

  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payroll period' })
  @ApiResponse({
    status: 201,
    description: 'Payroll period created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid period or payroll already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  async createPayroll(
    @Body() createPayrollDto: CreatePayrollDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `Admin ${req.user.userId} creating payroll for ${createPayrollDto.period_start} to ${createPayrollDto.period_end}`,
    );

    const payroll = await this.payrollService.createPayroll(
      new Date(createPayrollDto.period_start),
      new Date(createPayrollDto.period_end),
      req.user.userId,
      createPayrollDto.notes,
    );

    return {
      success: true,
      message: 'Payroll period created successfully',
      data: payroll,
    };
  }

  @Post(':payrollId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payroll - disburse salaries to staff' })
  @ApiResponse({
    status: 200,
    description: 'Payroll processed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Payroll already processed or insufficient funds',
  })
  @ApiResponse({
    status: 404,
    description: 'Payroll not found',
  })
  async processPayroll(
    @Param('payrollId') payrollId: string,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.userId} processing payroll ${payrollId}`);

    const result = await this.payrollService.processPayroll(payrollId);

    return {
      success: result.success,
      message: result.message,
      data: {
        processed: result.processed,
        failed: result.failed,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all payroll periods with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (pending, processing, completed, failed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll periods retrieved successfully',
  })
  async getAllPayrolls(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.payrollService.getAllPayrolls(
      pageNum,
      limitNum,
      status,
    );

    return {
      success: true,
      message: 'Payroll periods retrieved successfully',
      data: result,
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all payroll transactions with filtering' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (pending, processing, completed, failed)',
  })
  @ApiQuery({
    name: 'staffId',
    required: false,
    description: 'Filter by staff ID',
  })
  @ApiQuery({
    name: 'payrollId',
    required: false,
    description: 'Filter by payroll ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll transactions retrieved successfully',
  })
  async getAllPayrollTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('staffId') staffId?: string,
    @Query('payrollId') payrollId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.payrollService.getAllPayrollTransactions(
      pageNum,
      limitNum,
      status,
      staffId,
      payrollId,
    );

    return {
      success: true,
      message: 'Payroll transactions retrieved successfully',
      data: result,
    };
  }

  @Get(':payrollId')
  @ApiOperation({ summary: 'Get payroll details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Payroll details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payroll not found',
  })
  async getPayrollById(@Param('payrollId') payrollId: string) {
    const payroll = await this.payrollService.getPayrollById(payrollId);

    return {
      success: true,
      message: 'Payroll details retrieved successfully',
      data: payroll,
    };
  }

  @Get(':payrollId/transactions')
  @ApiOperation({ summary: 'Get payroll transactions (staff payments)' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll transactions retrieved successfully',
  })
  async getPayrollTransactions(
    @Param('payrollId') payrollId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.payrollService.getPayrollTransactions(
      payrollId,
      pageNum,
      limitNum,
      status,
    );

    return {
      success: true,
      message: 'Payroll transactions retrieved successfully',
      data: result,
    };
  }

  @Get(':payrollId/statistics')
  @ApiOperation({ summary: 'Get payroll statistics' })
  @ApiResponse({
    status: 200,
    description: 'Payroll statistics retrieved successfully',
  })
  async getPayrollStatistics(@Param('payrollId') payrollId: string) {
    const statistics =
      await this.payrollService.getPayrollStatistics(payrollId);

    return {
      success: true,
      message: 'Payroll statistics retrieved successfully',
      data: statistics,
    };
  }

  @Get('staff/:staffId/history')
  @ApiOperation({ summary: 'Get staff payroll history' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff payroll history retrieved successfully',
  })
  async getStaffPayrollHistory(
    @Param('staffId') staffId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.payrollService.getStaffPayrollHistory(
      staffId,
      pageNum,
      limitNum,
    );

    return {
      success: true,
      message: 'Staff payroll history retrieved successfully',
      data: result,
    };
  }

  @Post('transaction/:transactionId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed payroll transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retry attempted',
  })
  @ApiResponse({
    status: 400,
    description: 'Only failed transactions can be retried',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async retryFailedTransaction(
    @Param('transactionId') transactionId: string,
    @Request() req: any,
  ) {
    this.logger.log(
      `Admin ${req.user.userId} retrying transaction ${transactionId}`,
    );

    const result =
      await this.payrollService.retryFailedTransaction(transactionId);

    return {
      success: result.success,
      message: result.message,
    };
  }
}
