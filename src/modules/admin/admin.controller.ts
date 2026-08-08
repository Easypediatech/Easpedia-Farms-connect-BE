import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  UpdateAdminDto,
  UpdateProfileDto,
  AdminResponseDto,
  GetAllAdminsDto,
  ActivateAdminDto,
  DeactivateAdminDto,
  LoginAdminDto,
  LoginResponseDto,
  IntrospectResponseDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
  GetAllFarmersDto,
  AdminUpdateFarmerDto,
  GetAllBuyersDto,
  AdminFundWalletDto,
  AdminSetAccountDto,
  AdminFundOrganizationWalletDto,
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
} from './dto';
import {
  GetLoansDto,
  AdminApproveLoanRequestDto,
  AdminLoanKPIsDto,
  AdminLoanResponseDto,
} from './dto/loan-admin.dto';
import { CreateLoanDto } from '../loan/dto/create-loan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Types } from 'mongoose';
import { PayoutMonitoringService } from '../wallet/payout-monitoring.service';
import { WithdrawerKpiFilterDto } from '../wallet/dto/withdrawer-kpi-query.dto';
import { WithdrawerPayoutFilterDto } from '../wallet/dto/withdrawer-payout-query.dto';
import { FinanceOverviewDto } from './dto/finance-overview.dto';

@ApiTags('Admin')
@Controller('admins')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly payoutMonitoringService: PayoutMonitoringService,
  ) {}

  private assertValidObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid admin id');
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Create new admin',
    description:
      'Register a new admin account with role and permissions. Email is used for login. Requires strong password (min 8 chars, uppercase, lowercase, number).',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or weak password',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<AdminResponseDto> {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all admins with pagination',
    description:
      'Retrieve paginated list of admin accounts with optional filters (role, status, search). Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admins retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        admins: {
          type: 'array',
          items: { $ref: '#/components/schemas/AdminResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getAllAdmins(@Query() filters: GetAllAdminsDto): Promise<{
    admins: AdminResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.adminService.getAllAdmins(filters);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate admin account',
    description:
      'Activate a deactivated admin account. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin activated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        admin: { $ref: '#/components/schemas/AdminResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Admin account is already active',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async activateAdmin(
    @Param('id') id: string,
    @Body() activateDto: ActivateAdminDto,
  ): Promise<{ message: string; admin: AdminResponseDto }> {
    return this.adminService.activateAdmin(id, activateDto);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate admin account',
    description:
      'Deactivate an admin account. Admin will no longer be able to login. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        admin: { $ref: '#/components/schemas/AdminResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Admin account is already inactive',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async deactivateAdmin(
    @Param('id') id: string,
    @Body() deactivateDto: DeactivateAdminDto,
  ): Promise<{ message: string; admin: AdminResponseDto }> {
    return this.adminService.deactivateAdmin(id, deactivateDto);
  }

  @Get('farmers/list')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all farmers',
    description:
      'Retrieve paginated list of all farmers with optional filters (LGA, status, active loan). Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Farmers retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getAllFarmers(@Query() filters: GetAllFarmersDto) {
    return this.adminService.getAllFarmers(filters);
  }

  @Get('farmers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get farmer by ID',
    description:
      'Retrieve detailed information about a specific farmer. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Farmer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Farmer retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getFarmerById(@Param('id') id: string) {
    return this.adminService.getFarmerById(id);
  }

  @Patch('farmers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update farmer information',
    description:
      'Update farmer details such as name, LGA, or farm size. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Farmer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: AdminUpdateFarmerDto })
  @ApiResponse({
    status: 200,
    description: 'Farmer updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateFarmer(
    @Param('id') id: string,
    @Body() updateFarmerDto: AdminUpdateFarmerDto,
  ) {
    return this.adminService.updateFarmer(id, updateFarmerDto);
  }

  @Patch('farmers/:id/deactivate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate farmer account',
    description:
      'Suspend a farmer account, preventing them from accessing the system. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Farmer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Farmer deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async deactivateFarmer(@Param('id') id: string) {
    return this.adminService.deactivateFarmer(id);
  }

  @Patch('farmers/:id/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate farmer account',
    description:
      'Reactivate a previously suspended farmer account. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Farmer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Farmer activated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async activateFarmer(@Param('id') id: string) {
    return this.adminService.activateFarmer(id);
  }

  @Get('buyers/list')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all buyers',
    description:
      'Retrieve paginated list of all buyers with optional filters (LGA, buyer type, status). Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Buyers retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getAllBuyers(@Query() filters: GetAllBuyersDto) {
    return this.adminService.getAllBuyers(filters);
  }

  @Get('buyers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get buyer by ID',
    description:
      'Retrieve detailed information about a specific buyer. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Buyer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Buyer retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Buyer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getBuyerById(@Param('id') id: string) {
    return this.adminService.getBuyerById(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create product',
    description: 'Create market product with prices and size.',
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.adminService.createProduct(createProductDto);
  }

  @Get('products')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List products',
    description: 'Get list of products.',
  })
  async listProducts(): Promise<{
    products: ProductResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.adminService.getAllProducts();
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by id' })
  async getProduct(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.adminService.getProductById(id);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.adminService.updateProduct(id, dto);
  }

  @Patch('products/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product status' })
  async updateProductStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateProduct(id, {
      isActive: body.isActive,
    } as any);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    return this.adminService.deleteProduct(id);
  }

  // ================================
  // LOAN MANAGEMENT ENDPOINTS
  // ================================

  @Get('loans/kpis')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get loan KPIs',
    description: 'Retrieve loan statistics and metrics for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan KPIs retrieved successfully',
    type: AdminLoanKPIsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getLoanKPIs() {
    return this.adminService.getLoanKPIs();
  }

  @Get('loans')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all loans',
    description: 'Retrieve all loans with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Loans retrieved successfully',
    type: [AdminLoanResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getAllLoans(@Query() filters: GetLoansDto) {
    return this.adminService.getAllLoans(filters);
  }

  @Get('loan-requests')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all loan requests',
    description:
      'Retrieve all pending loan requests with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan requests retrieved successfully',
    type: [AdminLoanResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getLoanRequests(@Query() filters: GetLoansDto) {
    return this.adminService.getLoanRequests(filters);
  }

  @Get('loans/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get loan by ID',
    description: 'Retrieve detailed information about a specific loan',
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan details retrieved successfully',
    type: AdminLoanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getLoanById(@Param('id') id: string) {
    return this.adminService.getLoanById(id);
  }

  @Post('loans')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new loan',
    description:
      'Create a new loan for a farmer (admin-created loans are auto-approved)',
  })
  @ApiBody({ type: CreateLoanDto })
  @ApiResponse({
    status: 201,
    description: 'Loan created successfully',
    type: AdminLoanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid loan data provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createLoan(@Body() createLoanDto: CreateLoanDto) {
    return this.adminService.createLoan(createLoanDto);
  }

  @Patch('loans/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve loan request',
    description:
      'Approve a pending loan request and set pickup details. Sends SMS notification to farmer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Loan request ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @ApiBody({ type: AdminApproveLoanRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Loan request approved successfully',
    type: AdminLoanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid approval data or loan cannot be approved',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan request not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approveLoanRequest(
    @Param('id') id: string,
    @Body() approveDto: AdminApproveLoanRequestDto,
  ) {
    return this.adminService.approveLoanRequest(id, approveDto);
  }

  @Patch('loans/:id/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate approved loan',
    description:
      'Activate an approved loan when farmer picks up inputs. Changes status from approved to active.',
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan activated successfully',
    type: AdminLoanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Loan cannot be activated or pickup date not reached',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async activateLoan(@Param('id') id: string): Promise<AdminLoanResponseDto> {
    return await this.adminService.activateLoan(id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current admin profile',
    description:
      'Get the profile information of the currently authenticated admin user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current admin profile',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@Request() req: any): Promise<AdminResponseDto> {
    const user = req.user;
    // user.userId comes from JwtStrategy.validate
    return this.adminService.findById(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current admin profile',
    description:
      'Update the profile information of the currently authenticated admin user (email, name, phone).',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current admin profile',
    description:
      'Update the profile information of the currently authenticated admin user (email, name, phone).',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<AdminResponseDto> {
    const user = req.user;
    // user.userId comes from JwtStrategy.validate
    return this.adminService.updateProfile(user.userId, updateProfileDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description:
      'Authenticate admin with email and password. Returns JWT access token.',
  })
  @ApiBody({ type: LoginAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginAdminDto: LoginAdminDto): Promise<LoginResponseDto> {
    return this.adminService.login(loginAdminDto);
  }

  @Post('request-password-reset')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send OTP to admin phone number for password reset',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'OTP sent successfully to your phone number.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'OTP already sent or invalid phone number',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found with this phone number',
  })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.adminService.requestPasswordReset(requestDto);
  }

  @Post('verify-password-reset')
  @ApiOperation({
    summary: 'Verify OTP and reset password',
    description: 'Verify OTP code and set new password for admin account',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset successfully.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP, weak password, or inactive account',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found with this phone number',
  })
  async verifyPasswordReset(@Body() verifyDto: VerifyPasswordResetDto) {
    return this.adminService.verifyPasswordReset(verifyDto);
  }

  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Token introspection',
    description:
      'Verify and decode JWT access token. Send the access token in the Authorization header as "Bearer <token>".',
  })
  @ApiResponse({
    status: 200,
    description: 'Token information',
    type: IntrospectResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async introspect(
    @Headers('authorization') authorization: string,
  ): Promise<IntrospectResponseDto> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authorization.substring(7);
    return this.adminService.introspectToken(token);
  }

  @Post(':id/change-password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change admin password',
    description:
      'Change admin password. Requires current password verification and strong new password. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Current password incorrect or new password weak',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<AdminResponseDto> {
    return this.adminService.changePassword(id, changePasswordDto);
  }

  @Post('wallet/fund')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fund user wallet',
    description:
      'Admin endpoint to fund a user wallet. Requires admin authentication.',
  })
  @ApiBody({ type: AdminFundWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet funded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User wallet not found',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async fundWallet(@Body() fundWalletDto: AdminFundWalletDto) {
    return this.adminService.fundUserWallet(fundWalletDto);
  }

  @Post('wallet/set-account')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set user withdrawal account',
    description:
      'Admin endpoint to set or update user withdrawal bank account. Account is verified with Paystack. Requires admin authentication.',
  })
  @ApiBody({ type: AdminSetAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal account set successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bank details or verification failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User wallet not found',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setWithdrawalAccount(@Body() setAccountDto: AdminSetAccountDto) {
    return this.adminService.setUserWithdrawalAccount(setAccountDto);
  }

  @Get('settings/cassava-pricing')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cassava pricing',
    description: 'Retrieve current cassava pricing configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cassava pricing retrieved successfully',
  })
  getCassavaPricing() {
    return {
      pricePerKg: 500,
      pricePerTon: 450000,
    };
  }

  @Post('wallet/organization/create')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create organization salary wallet',
    description:
      'Create the organization wallet used for funding staff salaries. Only one organization wallet can exist.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          example: 'FarmConnect Ltd',
          description: 'Name of the organization',
        },
      },
      required: ['organization_name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization wallet created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Organization wallet already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async createOrganizationWallet(
    @Body('organization_name') organizationName: string,
  ) {
    return this.adminService.createOrganizationWallet(organizationName);
  }

  @Get('wallet/organization')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization salary wallet',
    description: 'Retrieve the organization wallet details including balance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization wallet retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization wallet not found',
  })
  async getOrganizationWallet() {
    return this.adminService.getOrganizationWallet();
  }

  @Post('wallet/organization/fund')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fund organization salary wallet',
    description:
      'Admin endpoint to fund the organization wallet used for staff salaries. If the organization wallet does not exist, it will be created automatically. Requires admin authentication.',
  })
  @ApiBody({ type: AdminFundOrganizationWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Organization wallet funded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid amount or wallet not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  async fundOrganizationWallet(
    @Body() fundWalletDto: AdminFundOrganizationWalletDto,
  ) {
    return this.adminService.fundOrganizationWallet(fundWalletDto);
  }

  @Get('wallet/organization/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List pooled organization wallets',
    description:
      'Retrieve payroll, bonus, withdrawer, purchase, withholding-tax, and charges organization wallet snapshots.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization wallets retrieved successfully',
  })
  async listOrgWalletBalances() {
    return this.adminService.listOrganizationWallets();
  }

  @Get('finance/kpis')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get finance overview',
    description:
      'Retrieve finance KPIs (operational and engagement metrics) with optional date filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance overview retrieved successfully',
    type: FinanceOverviewDto,
  })
  async getFinanceOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinanceOverviewDto> {
    return this.adminService.getFinanceOverview({ startDate, endDate });
  }

  @Get('withdrawers/kpis')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Summarize withdrawer payouts',
    description:
      'Retrieve aggregate metrics for withdrawer payout processing with optional date filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawer KPIs retrieved successfully',
  })
  async summarizeWithdrawerPayouts(@Query() filter: WithdrawerKpiFilterDto) {
    return this.payoutMonitoringService.summarizePayouts(filter);
  }

  @Get('withdrawers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List withdrawer payout records',
    description:
      'Retrieve paginated withdrawer payout records with status/date/search filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawer payouts retrieved successfully',
  })
  async listWithdrawerPayouts(@Query() filter: WithdrawerPayoutFilterDto) {
    return this.payoutMonitoringService.listPayouts(filter);
  }

  @Get('withdrawers/:withdrawerId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get withdrawer payout record details',
    description: 'Retrieve a single withdrawer payout record by ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawer payout details retrieved successfully',
  })
  async getWithdrawerPayoutDetail(@Param('withdrawerId') withdrawerId: string) {
    return this.payoutMonitoringService.getPayoutDetail(withdrawerId);
  }

  // Generic :id routes MUST be at the end to avoid catching specific routes like /staff, /wallet, /bonus
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin by ID',
    description:
      'Retrieve a single admin account by ID. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin retrieved successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async findById(@Param('id') id: string): Promise<AdminResponseDto> {
    this.assertValidObjectId(id);
    return this.adminService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update admin',
    description:
      'Update admin details (email, name, role, permissions). Password cannot be updated here (use change-password endpoint). Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Admin updated successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<AdminResponseDto> {
    this.assertValidObjectId(id);
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete admin',
    description:
      'Soft delete admin account by setting isActive to false. Admin can no longer login. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin deleted successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async delete(@Param('id') id: string): Promise<AdminResponseDto> {
    this.assertValidObjectId(id);
    return this.adminService.delete(id);
  }
}
