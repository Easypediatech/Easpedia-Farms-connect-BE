import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
import { UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DeactivateStaffDto } from './dto/deactivate-staff.dto';
import { formatSuccessResponse } from '../../common/utils/response.util';
import { CreateLoanDto } from './dto/create-loan.dto';
import { StaffSetAccountDto, StaffWithdrawDto } from './dto/staff-wallet.dto';
import { RequestPinResetDto, VerifyPinResetDto } from './dto/pin-reset.dto';
import { AddBvnDto } from './dto/add-bvn.dto';
import { AddNinDto } from './dto/add-nin.dto';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new staff member',
    description: 'Create a new staff account (inactive until approved)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Staff registered successfully',
  })
  @ApiBadRequestResponse({ description: 'Phone number already registered' })
  async register(@Body() registerStaffDto: RegisterStaffDto) {
    const staff = await this.staffService.register(registerStaffDto);
    return formatSuccessResponse(
      staff,
      'Staff registered successfully. Awaiting approval.',
    );
  }

  @Post('login')
  async login(@Body() loginStaffDto: LoginStaffDto) {
    const result = await this.staffService.login(loginStaffDto);
    return formatSuccessResponse(result, 'Login successful');
  }

  @Post('request-pin-reset')
  @ApiOperation({
    summary: 'Request PIN reset',
    description: 'Send OTP to staff phone number for PIN reset',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'OTP sent successfully to your phone number.',
        },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'OTP sent successfully to your phone number.',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'OTP already sent or invalid phone number',
  })
  async requestPinReset(@Body() requestDto: RequestPinResetDto) {
    const result = await this.staffService.requestPinReset(requestDto);
    return formatSuccessResponse(result, result.message);
  }

  @Post('verify-pin-reset')
  @ApiOperation({
    summary: 'Verify OTP and reset PIN',
    description: 'Verify OTP code and set new PIN for staff account',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'PIN reset successfully.' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'PIN reset successfully.' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid OTP or PIN format' })
  async verifyPinReset(@Body() verifyDto: VerifyPinResetDto) {
    const result = await this.staffService.verifyPinReset(verifyDto);
    return formatSuccessResponse(result, result.message);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Request() req: any) {
    const user = req.user;
    // user.userId comes from JwtStrategy.validate
    const profile = await this.staffService.getProfile(user.userId);
    return formatSuccessResponse(profile, 'Profile retrieved successfully');
  }

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get staff wallet balances' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Balances retrieved successfully' })
  async getBalances(@Request() req: any) {
    const profile = await this.staffService.getProfile(req.user.userId);
    const balances = {
      savings: (profile.wallet?.savings_balance || 0) / 100,
      pension: (profile.wallet?.escrow_balance || 0) / 100,
      wallet: (profile.wallet?.balance || 0) / 100,
      bonus: (profile.wallet?.bonus_balance || 0) / 100,
    };
    return formatSuccessResponse(balances, 'Balances retrieved successfully');
  }

  @Post('add-bvn')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add BVN', description: 'Add or update staff BVN' })
  @ApiResponse({ status: HttpStatus.OK, description: 'BVN added successfully' })
  @ApiBadRequestResponse({ description: 'Invalid BVN or not allowed' })
  async addBvn(@Body() addBvnDto: AddBvnDto, @Request() req: any) {
    const result = await this.staffService.addBvn(
      req.user.userId,
      addBvnDto.bvn,
    );
    return formatSuccessResponse(result, 'BVN added successfully');
  }

  @Post('add-nin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Add NIN',
    description: 'Add or update staff NIN (Cloudinary URL)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'NIN added successfully' })
  @ApiBadRequestResponse({ description: 'Invalid NIN URL or not allowed' })
  async addNin(@Body() addNinDto: AddNinDto, @Request() req: any) {
    const result = await this.staffService.addNin(
      req.user.userId,
      addNinDto.nin,
    );
    return formatSuccessResponse(result, 'NIN added successfully');
  }

  @Post(':staffId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve staff registration',
    description: 'Approve and activate staff account, create wallet',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff approved successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  @ApiBadRequestResponse({ description: 'Staff already approved' })
  async approveStaff(
    @Param('staffId') staffId: string,
    @Query('approvedBy') approvedBy: string,
  ) {
    const staff = await this.staffService.approveStaff(staffId, approvedBy);
    return formatSuccessResponse(staff, 'Staff approved successfully');
  }

  @Get()
  @ApiOperation({
    summary: 'Get all staff',
    description: 'Get paginated list of all staff with filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'is_approved', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff list retrieved successfully',
  })
  async getAllStaff(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('department') department?: string,
    @Query('is_approved') is_approved?: boolean,
  ) {
    const result = await this.staffService.getAllStaff({
      page,
      limit,
      search,
      status,
      role,
      department,
      is_approved,
    });
    return formatSuccessResponse(result, 'Staff list retrieved successfully');
  }

  @Get(':staffId')
  @ApiOperation({
    summary: 'Get staff by ID',
    description: 'Get detailed staff information by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff details retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async getStaffById(@Param('staffId') staffId: string) {
    const staff = await this.staffService.getStaffById(staffId);
    return formatSuccessResponse(staff, 'Staff details retrieved successfully');
  }

  @Get('phone/:phone')
  @ApiOperation({
    summary: 'Get staff by phone',
    description: 'Get staff information by phone number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff details retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async getStaffByPhone(@Param('phone') phone: string) {
    const staff = await this.staffService.getStaffByPhone(phone);
    return formatSuccessResponse(staff, 'Staff details retrieved successfully');
  }

  @Patch(':staffId')
  @ApiOperation({
    summary: 'Update staff information',
    description: 'Update staff profile details',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff updated successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async updateStaff(
    @Param('staffId') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    const staff = await this.staffService.updateStaff(staffId, updateStaffDto);
    return formatSuccessResponse(staff, 'Staff updated successfully');
  }

  @Post(':staffId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate staff',
    description: 'Deactivate staff account with reason',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff deactivated successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  @ApiBadRequestResponse({ description: 'Staff already deactivated' })
  async deactivateStaff(
    @Param('staffId') staffId: string,
    @Body() deactivateStaffDto: DeactivateStaffDto,
  ) {
    const staff = await this.staffService.deactivateStaff(
      staffId,
      deactivateStaffDto,
    );
    return formatSuccessResponse(staff, 'Staff deactivated successfully');
  }

  @Post(':staffId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate staff',
    description: 'Reactivate a deactivated staff account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff reactivated successfully',
  })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  @ApiBadRequestResponse({
    description: 'Staff already active or not approved',
  })
  async reactivateStaff(@Param('staffId') staffId: string) {
    const staff = await this.staffService.reactivateStaff(staffId);
    return formatSuccessResponse(staff, 'Staff reactivated successfully');
  }

  /**
   * NEW: Staff requests a personal loan for themselves
   * Delegates to StaffService.requestStaffLoan
   */
  @Post(':staffId/request-loan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Staff requests a personal loan for themselves' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Loan requested successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async requestStaffLoan(
    @Param('staffId') staffId: string,
    @Body() createLoanDto: CreateLoanDto,
  ) {
    const loan = await this.staffService.requestStaffLoan(
      staffId,
      createLoanDto,
    );
    return formatSuccessResponse(loan, 'Loan requested successfully');
  }

  // ==================== WALLET ENDPOINTS ====================

  @Post('wallet/verify-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify bank account',
    description: 'Verify bank account number and get account holder name',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account verified successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid account details' })
  async verifyAccount(
    @Body() body: { accountNumber: string; bankCode: string },
  ) {
    const result = await this.staffService.verifyAccount(
      body.accountNumber,
      body.bankCode,
    );
    return formatSuccessResponse(result, 'Account verified successfully');
  }

  @Get('wallet/banks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get list of banks',
    description: 'Get list of supported banks for withdrawal account setup',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of banks retrieved successfully',
  })
  async getBanks() {
    const banks = await this.staffService.getBanks();
    return formatSuccessResponse(banks, 'Banks retrieved successfully');
  }

  @Get('wallet/account')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get saved withdrawal account',
    description: 'Get the staff saved withdrawal account details',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account details retrieved successfully',
  })
  async getWithdrawalAccount(@Request() req: any) {
    const wallet = await this.staffService.getWallet(req.user.userId);
    return formatSuccessResponse(
      {
        bankName: wallet.bank_name,
        bankCode: wallet.bank_code,
        accountNumber: wallet.account_number,
        accountName: wallet.account_name,
      },
      'Withdrawal account retrieved successfully',
    );
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get wallet details',
    description: 'Get staff wallet balance and account information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet details retrieved successfully',
  })
  async getWallet(@Request() req: any) {
    const wallet = await this.staffService.getWallet(req.user.userId);
    return formatSuccessResponse(
      {
        balance: wallet.balance / 100,
        escrowBalance: wallet.escrow_balance / 100,
        savingsBalance: wallet.savings_balance / 100,
        pensionBalance: wallet.pension_balance / 100,
        totalEarned: wallet.total_earned / 100,
        totalSpent: wallet.total_spent / 100,
        totalWithdrawn: wallet.total_withdrawn / 100,
        totalDeposited: wallet.total_deposited / 100,
        bankName: wallet.bank_name,
        bankCode: wallet.bank_code,
        accountNumber: wallet.account_number,
        accountName: wallet.account_name,
      },
      'Wallet details retrieved successfully',
    );
  }

  @Post('wallet/set-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set withdrawal account',
    description: 'Set or update the staff withdrawal account with bank details',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Withdrawal account set successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid account details' })
  async setWithdrawalAccount(
    @Body() setAccountDto: StaffSetAccountDto,
    @Request() req: any,
  ) {
    const result = await this.staffService.setWithdrawalAccount(
      req.user.userId,
      setAccountDto,
    );
    return formatSuccessResponse(result, 'Withdrawal account set successfully');
  }

  @Post('wallet/withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw from wallet',
    description:
      'Withdraw funds from staff wallet to saved or specified account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Withdrawal processed successfully',
  })
  @ApiBadRequestResponse({ description: 'Insufficient balance or invalid PIN' })
  async withdrawFromWallet(
    @Body() withdrawDto: StaffWithdrawDto,
    @Request() req: any,
  ) {
    const result = await this.staffService.withdrawFromWallet(
      req.user.userId,
      withdrawDto,
    );
    return formatSuccessResponse(result, 'Withdrawal processed successfully');
  }
}
