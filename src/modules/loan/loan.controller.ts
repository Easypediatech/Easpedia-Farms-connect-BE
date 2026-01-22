import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Patch,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffOrAdminGuard } from '../../common/guards/staff-or-admin.guard';
import { CreateLoanTypeDto, LoanCategory } from './dto/create-loan-type.dto';
import {
  CreateLoanDto,
  UpdateLoanStatusDto,
  RecordLoanPaymentDto,
  ApproveLoanRequestDto,
} from './dto/create-loan.dto';
import { GetAllLoansDto } from './dto/get-all-loans.dto';
import {
  LoanTypeResponseDto,
  LoanResponseDto,
  LoanKPIsDto,
} from './dto/loan-response.dto';

@ApiTags('Loan Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoanController {
  private readonly logger = new Logger(LoanController.name);

  constructor(private readonly loanService: LoanService) {}

  // ==================== LOAN TYPE ENDPOINTS ====================

  @Post('types')
  @ApiOperation({
    summary: 'Create a new loan type',
    description:
      'Admin endpoint to create a new loan package (input credit, farm tools, equipment)',
  })
  @ApiResponse({
    status: 201,
    description: 'Loan type created successfully',
    type: LoanTypeResponseDto,
  })
  async createLoanType(
    @Body() createDto: CreateLoanTypeDto,
  ): Promise<LoanTypeResponseDto> {
    return this.loanService.createLoanType(createDto);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard, StaffOrAdminGuard)
  @ApiOperation({
    summary: 'Get all loan types',
    description: 'Get all available loan packages with optional filters',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: LoanCategory,
    description: 'Filter by loan category',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of loan types',
    type: [LoanTypeResponseDto],
  })
  async getAllLoanTypes(
    @Query('category') category?: string,
    @Query('is_active') is_active?: string,
    @Request() req?: any,
  ): Promise<LoanTypeResponseDto[]> {
    this.logger.log(
      `User ${req?.user?.sub} (${req?.user?.type}) requesting loan types with filters: category=${category}, is_active=${is_active}`,
    );

    const filters: any = {};
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const result = await this.loanService.getAllLoanTypes(filters);
    this.logger.log(
      `Returning ${result.length} loan types for user ${req?.user?.sub}`,
    );

    return result;
  }

  @Get('types/:id')
  @UseGuards(JwtAuthGuard, StaffOrAdminGuard)
  @ApiOperation({
    summary: 'Get loan type by ID',
    description: 'Get details of a specific loan type',
  })
  @ApiParam({ name: 'id', description: 'Loan type ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan type details',
    type: LoanTypeResponseDto,
  })
  async getLoanTypeById(@Param('id') id: string): Promise<LoanTypeResponseDto> {
    return this.loanService.getLoanTypeById(id);
  }

  @Put('types/:id')
  @ApiOperation({
    summary: 'Update loan type',
    description: 'Update details of an existing loan type',
  })
  @ApiParam({ name: 'id', description: 'Loan type ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan type updated successfully',
    type: LoanTypeResponseDto,
  })
  async updateLoanType(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLoanTypeDto>,
  ): Promise<LoanTypeResponseDto> {
    return this.loanService.updateLoanType(id, updateDto);
  }

  @Patch('types/:id/toggle-active')
  @ApiOperation({
    summary: 'Toggle loan type active status',
    description: 'Activate or deactivate a loan type',
  })
  @ApiParam({ name: 'id', description: 'Loan type ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan type status toggled',
    type: LoanTypeResponseDto,
  })
  async toggleLoanTypeActive(
    @Param('id') id: string,
  ): Promise<LoanTypeResponseDto> {
    return this.loanService.toggleLoanTypeActive(id);
  }

  @Delete('types/:id')
  @ApiOperation({
    summary: 'Delete loan type',
    description: 'Delete a loan type (use with caution)',
  })
  @ApiParam({ name: 'id', description: 'Loan type ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan type deleted successfully',
  })
  async deleteLoanType(@Param('id') id: string): Promise<{ message: string }> {
    return this.loanService.deleteLoanType(id);
  }

  // ==================== LOAN ENDPOINTS ====================

  @Post()
  @ApiOperation({
    summary: 'Create/Issue a new loan to a farmer',
    description:
      'Admin endpoint to issue a loan to a farmer based on a loan type',
  })
  @ApiResponse({
    status: 201,
    description: 'Loan issued successfully',
    type: LoanResponseDto,
  })
  async createLoan(@Body() createDto: CreateLoanDto): Promise<LoanResponseDto> {
    return this.loanService.createLoan(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all loans',
    description: 'Get all loans with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of loans',
  })
  async getAllLoans(@Query() filters: GetAllLoansDto): Promise<{
    loans: LoanResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.loanService.getAllLoans(filters);
  }

  @Get('kpis')
  @ApiOperation({
    summary: 'Get loan KPIs and statistics',
    description:
      'Get loan dashboard metrics: active loans, outstanding amounts, default rates, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan statistics and KPIs',
    type: LoanKPIsDto,
  })
  async getLoanKPIs(): Promise<LoanKPIsDto> {
    return this.loanService.getLoanKPIs();
  }

  @Get('requests')
  @ApiOperation({
    summary: 'Get all loan requests',
    description:
      'Get all pending loan requests from farmers (status = requested)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of loan requests',
    type: [LoanResponseDto],
  })
  async getRequestedLoans(): Promise<LoanResponseDto[]> {
    return this.loanService.getRequestedLoans();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get loan by ID',
    description: 'Get detailed information about a specific loan',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan details',
    type: LoanResponseDto,
  })
  async getLoanById(@Param('id') id: string): Promise<LoanResponseDto> {
    return this.loanService.getLoanById(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update loan status',
    description: 'Update loan status (active, completed, defaulted)',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan status updated',
    type: LoanResponseDto,
  })
  async updateLoanStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateLoanStatusDto,
  ): Promise<LoanResponseDto> {
    return this.loanService.updateLoanStatus(id, updateDto);
  }

  @Post(':id/payment')
  @ApiOperation({
    summary: 'Record loan payment',
    description: 'Record a payment made towards a loan',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment recorded successfully',
    type: LoanResponseDto,
  })
  async recordPayment(
    @Param('id') id: string,
    @Body() paymentDto: RecordLoanPaymentDto,
  ): Promise<LoanResponseDto> {
    return this.loanService.recordPayment(id, paymentDto);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Approve a loan request',
    description:
      'Admin approves a loan request and sets pickup date for factory inputs',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan request approved successfully',
    type: LoanResponseDto,
  })
  async approveLoanRequest(
    @Param('id') id: string,
    @Body() approveDto: ApproveLoanRequestDto,
  ): Promise<LoanResponseDto> {
    return this.loanService.approveLoanRequest(id, approveDto);
  }
}
