import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { AdminRepository } from './admin.repository';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
} from './dto/password-reset.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { IntrospectResponseDto } from './dto/introspect-response.dto';
import { FarmerDetailDto } from './dto/farmer-detail.dto';
import { BuyerDetailDto } from './dto/buyer-detail.dto';
import { GetAllFarmersDto } from './dto/get-all-farmers.dto';
import { GetAllBuyersDto } from './dto/get-all-buyers.dto';
import { DashboardKPIsDto } from './dto/dashboard-kpis.dto';
import { plainToInstance } from 'class-transformer';
import {
  DuplicateEmailException,
  InvalidCredentialsException,
} from '../../common/exceptions';
import {
  hashPassword,
  comparePassword,
  isStrongPassword,
} from '../../common/utils/password.util';
import { normalizePhoneNumber } from '../../common/utils/pin.util';
import { OtpService } from '../../common/services/otp.service';
import { User, UserDocument } from '../../schemas/user.schema';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { FarmerRepository } from '../farmer/farmer.repository';
import { Buyer, BuyerDocument } from '../../schemas/buyer.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Purchase, PurchaseDocument } from '../../schemas/purchase.schema';
import {
  UssdSession,
  UssdSessionDocument,
} from '../../schemas/ussd-session.schema';
import { ProductRepository } from './product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { Loan, LoanDocument } from '../../schemas/loan.schema';
import { LoanType, LoanTypeDocument } from '../../schemas/loan-type.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { LoanRepository } from '../loan/loan.repository';
import { PhoneUtil } from '../../common/utils/phone.util';
import { SmsService } from '../../common/services/sms.service';
import {
  GetLoansDto,
  AdminApproveLoanRequestDto,
  AdminLoanKPIsDto,
  AdminLoanResponseDto,
} from './dto/loan-admin.dto';
import { CreateLoanDto } from '../loan/dto/create-loan.dto';
import { CreateSettingsDto } from './dto/settings/create-settings.dto';
import { SettingsResponseDto } from './dto/settings/settings-response.dto';
import { StaffRepository } from '../staff/staff.repository';
import { StaffService } from '../staff/staff.service';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtService,
    private readonly productRepository: ProductRepository,
    private readonly loanRepository: LoanRepository,
    private readonly smsService: SmsService,
    private readonly otpService: OtpService,
    private readonly staffRepository: StaffRepository,
    private readonly staffService: StaffService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
    private readonly farmerRepository: FarmerRepository,
    @InjectModel(Buyer.name) private readonly buyerModel: Model<BuyerDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(UssdSession.name)
    private readonly ussdSessionModel: Model<UssdSessionDocument>,
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
    @InjectModel(LoanType.name)
    private readonly loanTypeModel: Model<LoanTypeDocument>,
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
  ) {}

  // Wallet service will be injected via setter to avoid circular dependency
  private walletService: any;

  /**
   * Create a new admin account
   *
   * @param createAdminDto - Admin data
   * @returns Created admin response
   * @throws DuplicateUsernameException if username exists
   * @throws DuplicateEmailException if email exists
   * @throws BadRequestException if password is weak
   */
  async create(createAdminDto: CreateAdminDto): Promise<AdminResponseDto> {
    this.logger.log(`Creating admin: ${createAdminDto.email}`);

    // Check if email already exists
    const existingEmail = await this.adminRepository.findByEmail(
      createAdminDto.email,
    );
    if (existingEmail) {
      throw new DuplicateEmailException(createAdminDto.email);
    }

    // Validate password strength
    if (!isStrongPassword(createAdminDto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number',
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(createAdminDto.password);

    // Create admin
    const admin = await this.adminRepository.create({
      ...createAdminDto,
      password: hashedPassword,
    });

    this.logger.log(`Admin created successfully: ${admin.email}`);

    return this.transformToResponseDto(admin);
  }

  /**
   * Find admin by ID
   *
   * @param id - Admin ID
   * @returns Admin response
   * @throws NotFoundException if admin not found
   */
  async findById(id: string): Promise<AdminResponseDto> {
    const admin = await this.adminRepository.findById(id);

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return this.transformToResponseDto(admin);
  }

  /**
   * Get all active admins
   *
   * @returns Array of admin responses
   */
  async findAll(): Promise<AdminResponseDto[]> {
    const admins = await this.adminRepository.findAll();
    return admins.map((admin) => this.transformToResponseDto(admin));
  }

  /**
   * Get all admins with pagination and filters
   *
   * @param filters - Query filters
   * @returns Paginated list of admins
   */
  async getAllAdmins(filters: any): Promise<{
    admins: AdminResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, role, status } = filters;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (status && status !== 'all') {
      query.is_active = status === 'active';
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
      ];
    }

    // Get admins with pagination
    const [admins, total] = await Promise.all([
      this.adminRepository.findAllWithQuery({
        query,
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.adminRepository.countWithQuery(query),
    ]);

    return {
      admins: admins.map((admin) => this.transformToResponseDto(admin)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update admin details
   *
   * @param id - Admin ID
   * @param updateAdminDto - Update data
   * @returns Updated admin response
   * @throws NotFoundException if admin not found
   * @throws DuplicateEmailException if email already exists
   */
  async update(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Updating admin: ${id}`);

    // Check if admin exists
    const existingAdmin = await this.adminRepository.findById(id);
    if (!existingAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Check if email is being updated and already exists
    if (updateAdminDto.email && updateAdminDto.email !== existingAdmin.email) {
      const emailExists = await this.adminRepository.findByEmail(
        updateAdminDto.email,
      );
      if (emailExists) {
        throw new DuplicateEmailException(updateAdminDto.email);
      }
    }

    const updatedAdmin = await this.adminRepository.update(id, updateAdminDto);

    if (!updatedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(`Admin updated successfully: ${id}`);

    return this.transformToResponseDto(updatedAdmin);
  }

  /**
   * Delete admin (soft delete)
   *
   * @param id - Admin ID
   * @returns Deleted admin response
   * @throws NotFoundException if admin not found
   */
  async delete(id: string): Promise<AdminResponseDto> {
    this.logger.log(`Deleting admin: ${id}`);

    const deletedAdmin = await this.adminRepository.delete(id);

    if (!deletedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(`Admin deleted successfully: ${id}`);

    return this.transformToResponseDto(deletedAdmin);
  }

  /**
   * Activate admin account
   *
   * @param id - Admin ID
   * @param activateDto - Activation data with optional reason
   * @returns Success message and updated admin
   * @throws NotFoundException if admin not found
   */
  async activateAdmin(
    id: string,
    activateDto: any,
  ): Promise<{ message: string; admin: AdminResponseDto }> {
    this.logger.log(`Activating admin: ${id}`);

    // Check if admin exists
    const existingAdmin = await this.adminRepository.findById(id);
    if (!existingAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Check if already active
    if (existingAdmin.is_active) {
      throw new Error('Admin account is already active');
    }

    // Update admin status
    const updatedAdmin = await this.adminRepository.update(id, {
      isActive: true,
    } as any);

    if (!updatedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(
      `Admin activated successfully: ${id} - Reason: ${activateDto?.reason || 'No reason provided'}`,
    );

    return {
      message: `Admin account for ${updatedAdmin.first_name} ${updatedAdmin.last_name} has been successfully activated`,
      admin: this.transformToResponseDto(updatedAdmin),
    };
  }

  /**
   * Deactivate admin account
   *
   * @param id - Admin ID
   * @param deactivateDto - Deactivation data with optional reason
   * @returns Success message and updated admin
   * @throws NotFoundException if admin not found
   */
  async deactivateAdmin(
    id: string,
    deactivateDto: any,
  ): Promise<{ message: string; admin: AdminResponseDto }> {
    this.logger.log(`Deactivating admin: ${id}`);

    // Check if admin exists
    const existingAdmin = await this.adminRepository.findById(id);
    if (!existingAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Check if already inactive
    if (!existingAdmin.is_active) {
      throw new Error('Admin account is already inactive');
    }

    // Prevent self-deactivation (would need current user context for this)
    // This could be implemented with a decorator to get current user

    // Update admin status
    const updatedAdmin = await this.adminRepository.update(id, {
      isActive: false,
    } as any);

    if (!updatedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(
      `Admin deactivated successfully: ${id} - Reason: ${deactivateDto?.reason || 'No reason provided'}`,
    );

    return {
      message: `Admin account for ${updatedAdmin.first_name} ${updatedAdmin.last_name} has been successfully deactivated`,
      admin: this.transformToResponseDto(updatedAdmin),
    };
  }

  /**
   * Admin login
   *
   * @param loginAdminDto - Login credentials
   * @returns JWT access token and admin info
   * @throws InvalidCredentialsException if credentials are invalid
   */
  async login(loginAdminDto: LoginAdminDto): Promise<LoginResponseDto> {
    this.logger.log(`Admin login attempt: ${loginAdminDto.email}`);

    const admin = (await this.adminRepository.findByEmail(
      loginAdminDto.email,
    )) as any;

    if (!admin) {
      throw new InvalidCredentialsException();
    }

    // Check if admin is active
    if (!(admin as any).is_active) {
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      loginAdminDto.password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: String(admin._id),
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Admin logged in successfully: ${admin.email}`);

    return plainToInstance(
      LoginResponseDto,
      {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 86400, // 24 hours in seconds
        adminId: String(admin._id),
        email: admin.email,
        role: admin.role,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Introspect JWT token
   *
   * @param token - JWT token to introspect
   * @returns Token information
   */
  async introspectToken(token: string): Promise<IntrospectResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      return plainToInstance(
        IntrospectResponseDto,
        {
          active: true,
          adminId: payload.sub,
          email: payload.email,
          role: payload.role,
          type: payload.type,
          iat: payload.iat,
          exp: payload.exp,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      return plainToInstance(
        IntrospectResponseDto,
        { active: false },
        { excludeExtraneousValues: true },
      );
    }
  }

  /**
   * Change admin password
   *
   * @param id - Admin ID
   * @param changePasswordDto - Password change data
   * @returns Updated admin response
   * @throws NotFoundException if admin not found
   * @throws BadRequestException if current password is incorrect or new password is weak
   */
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Changing password for admin: ${id}`);

    const admin = await this.adminRepository.findById(id);

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      changePasswordDto.currentPassword,
      admin.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    if (!isStrongPassword(changePasswordDto.newPassword)) {
      throw new BadRequestException(
        'New password must be at least 8 characters and contain uppercase, lowercase, and number',
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(changePasswordDto.newPassword);

    // Update password
    const updatedAdmin = await this.adminRepository.update(id, {
      password: hashedPassword,
    } as any);

    if (!updatedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(`Password changed successfully for admin: ${id}`);

    return this.transformToResponseDto(updatedAdmin);
  }

  /**
   * Update admin profile (self-update)
   *
   * @param id - Admin ID
   * @param updateProfileDto - Profile update data
   * @returns Updated admin response
   * @throws NotFoundException if admin not found
   * @throws BadRequestException if email already exists
   */
  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Updating profile for admin: ${id}`);

    const admin = await this.adminRepository.findById(id);
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Check if email is being updated and if it already exists
    if (updateProfileDto.email && updateProfileDto.email !== admin.email) {
      const existingAdmin = await this.adminRepository.findByEmail(
        updateProfileDto.email,
      );
      if (existingAdmin && (existingAdmin as any)._id.toString() !== id) {
        throw new DuplicateEmailException(updateProfileDto.email);
      }
    }

    // Normalize phone number if provided
    let normalizedPhone: string | undefined;
    if (updateProfileDto.phone) {
      const { phone } = normalizePhoneNumber(updateProfileDto.phone);
      normalizedPhone = phone;
    }

    // Update fields
    const updateData: any = {};
    if (updateProfileDto.email) updateData.email = updateProfileDto.email;
    if (updateProfileDto.firstName)
      updateData.first_name = updateProfileDto.firstName;
    if (updateProfileDto.lastName)
      updateData.last_name = updateProfileDto.lastName;
    if (normalizedPhone) updateData.phone = normalizedPhone;

    const updatedAdmin = await this.adminRepository.update(id, updateData);
    if (!updatedAdmin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    this.logger.log(`Profile updated successfully for admin: ${id}`);

    return this.transformToResponseDto(updatedAdmin);
  }

  /**
   * Get all farmers with optional filters
   *
   * @param filters - Query filters
   * @returns Paginated list of farmers
   */
  async getAllFarmers(filters: GetAllFarmersDto): Promise<{
    farmers: FarmerDetailDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Fetching all farmers with filters');

    const {
      page = 1,
      limit = 20,
      lga,
      status,
      activeLoan,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    // Add filters
    const farmerQuery: any = {};
    if (lga) {
      farmerQuery.lga = lga;
    }
    if (activeLoan !== undefined) {
      farmerQuery.active_loan = activeLoan === 'true';
    }

    // Find farmers matching the query
    const farmers = await this.farmerModel
      .find(farmerQuery)
      .sort({
        [sortBy === 'createdAt' ? 'createdAt' : sortBy]:
          sortOrder === 'asc' ? 1 : -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    // Get user info for each farmer
    const userIds = farmers.map((f) => f.user_id);
    const users = await this.userModel.find({ _id: { $in: userIds } }).exec();

    // Filter by status if provided
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const farmersWithUsers = farmers
      .map((farmer) => {
        const user = userMap.get(String(farmer.user_id));
        if (!user) return undefined;
        if (status && user.status !== status) return undefined;
        return { farmer, user };
      })
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    // Get wallet balances for farmers
    const walletUserIds = farmersWithUsers.map(({ user }) => user._id);
    const wallets = await this.walletModel
      .find({ user_id: { $in: walletUserIds }, user_type: 'farmer' })
      .exec();
    const walletMap = new Map(
      wallets.map((w) => [String(w.user_id), w.balance / 100]), // Convert kobo to naira
    );

    // Get total count
    const total = await this.farmerModel.countDocuments(farmerQuery);

    // Transform to DTOs
    const farmerDtos = farmersWithUsers.map(({ farmer, user }) => {
      const walletBalance = walletMap.get(String(user._id)) || 0;
      return this.transformToFarmerDetailDto(farmer, user, walletBalance);
    });

    return {
      farmers: farmerDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get farmer by ID
   *
   * @param id - Farmer ID
   * @returns Farmer details
   * @throws NotFoundException if farmer not found
   */
  async getFarmerById(id: string): Promise<FarmerDetailDto> {
    this.logger.log(`Fetching farmer by ID: ${id}`);

    const farmer = await this.farmerModel.findById(id).exec();
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for farmer ${id} not found`);
    }

    // Get wallet balance
    const wallet = await this.walletModel
      .findOne({ user_id: user._id, user_type: 'farmer' })
      .exec();
    const walletBalance = wallet ? wallet.balance / 100 : 0; // Convert kobo to naira

    return this.transformToFarmerDetailDto(farmer, user, walletBalance);
  }

  /**
   * Update farmer information
   *
   * @param id - Farmer ID
   * @param updateFarmerDto - Update data
   * @returns Updated farmer details
   * @throws NotFoundException if farmer not found
   */
  async updateFarmer(
    id: string,
    updateFarmerDto: any,
  ): Promise<FarmerDetailDto> {
    this.logger.log(`Updating farmer: ${id}`);

    const farmer = await this.farmerModel.findById(id).exec();
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for farmer ${id} not found`);
    }

    // Update farmer fields
    if (updateFarmerDto.firstName) {
      farmer.first_name = updateFarmerDto.firstName;
    }
    if (updateFarmerDto.lastName) {
      farmer.last_name = updateFarmerDto.lastName;
    }
    if (updateFarmerDto.lga) {
      farmer.lga = updateFarmerDto.lga;
    }
    if (updateFarmerDto.farmSizeHectares !== undefined) {
      farmer.farm_size_hectares = updateFarmerDto.farmSizeHectares;
    }

    await farmer.save();

    this.logger.log(`Farmer updated successfully: ${id}`);

    // Get wallet balance
    const wallet = await this.walletModel
      .findOne({ user_id: user._id, user_type: 'farmer' })
      .exec();
    const walletBalance = wallet ? wallet.balance / 100 : 0;

    return this.transformToFarmerDetailDto(farmer, user, walletBalance);
  }

  /**
   * Deactivate farmer account
   *
   * @param id - Farmer ID
   * @returns Success message and updated farmer
   * @throws NotFoundException if farmer not found
   */
  async deactivateFarmer(
    id: string,
  ): Promise<{ message: string; farmer: FarmerDetailDto }> {
    this.logger.log(`Deactivating farmer: ${id}`);

    const farmer = await this.farmerModel.findById(id).exec();
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for farmer ${id} not found`);
    }

    // Update user status to suspended
    user.status = 'suspended';
    await user.save();

    this.logger.log(`Farmer deactivated successfully: ${id}`);

    // Get wallet balance
    const wallet = await this.walletModel
      .findOne({ user_id: user._id, user_type: 'farmer' })
      .exec();
    const walletBalance = wallet ? wallet.balance / 100 : 0;

    return {
      message: 'Farmer account deactivated successfully',
      farmer: this.transformToFarmerDetailDto(farmer, user, walletBalance),
    };
  }

  /**
   * Activate farmer account
   *
   * @param id - Farmer ID
   * @returns Success message and updated farmer
   * @throws NotFoundException if farmer not found
   */
  async activateFarmer(
    id: string,
  ): Promise<{ message: string; farmer: FarmerDetailDto }> {
    this.logger.log(`Activating farmer: ${id}`);

    const farmer = await this.farmerModel.findById(id).exec();
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for farmer ${id} not found`);
    }

    // Update user status to active
    user.status = 'active';
    await user.save();

    this.logger.log(`Farmer activated successfully: ${id}`);

    // Get wallet balance
    const wallet = await this.walletModel
      .findOne({ user_id: user._id, user_type: 'farmer' })
      .exec();
    const walletBalance = wallet ? wallet.balance / 100 : 0;

    return {
      message: 'Farmer account activated successfully',
      farmer: this.transformToFarmerDetailDto(farmer, user, walletBalance),
    };
  }

  /**
   * Get all buyers with optional filters
   *
   * @param filters - Query filters
   * @returns Paginated list of buyers
   */
  async getAllBuyers(filters: GetAllBuyersDto): Promise<{
    buyers: BuyerDetailDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Fetching all buyers with filters');

    const {
      page = 1,
      limit = 20,
      lga,
      buyerType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const buyerQuery: any = {};
    if (lga) {
      buyerQuery.lga = lga;
    }
    if (buyerType) {
      buyerQuery.buyer_type = buyerType;
    }

    // Find buyers matching the query
    const buyers = await this.buyerModel
      .find(buyerQuery)
      .sort({
        [sortBy === 'createdAt' ? 'createdAt' : sortBy]:
          sortOrder === 'asc' ? 1 : -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    // Get user info for each buyer
    const userIds = buyers.map((b) => b.user_id);
    const users = await this.userModel.find({ _id: { $in: userIds } }).exec();

    // Filter by status if provided
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const buyersWithUsers = buyers
      .map((buyer) => {
        const user = userMap.get(String(buyer.user_id));
        if (!user) return undefined;
        if (status && user.status !== status) return undefined;
        return { buyer, user };
      })
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    // Get total count
    const total = await this.buyerModel.countDocuments(buyerQuery);

    // Transform to DTOs
    const buyerDtos = buyersWithUsers.map(({ buyer, user }) =>
      this.transformToBuyerDetailDto(buyer, user),
    );

    return {
      buyers: buyerDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get buyer by ID
   *
   * @param id - Buyer ID
   * @returns Buyer details
   * @throws NotFoundException if buyer not found
   */
  async getBuyerById(id: string): Promise<BuyerDetailDto> {
    this.logger.log(`Fetching buyer by ID: ${id}`);

    const buyer = await this.buyerModel.findById(id).exec();
    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${id} not found`);
    }

    const user = await this.userModel.findById(buyer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for buyer ${id} not found`);
    }

    return this.transformToBuyerDetailDto(buyer, user);
  }

  /**
   * Transform admin entity to response DTO
   *
   * @param admin - Admin entity
   * @returns Admin response DTO
   */
  private transformToResponseDto(admin: any): AdminResponseDto {
    return plainToInstance(AdminResponseDto, admin, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Transform farmer and user to farmer detail DTO
   *
   * @param farmer - Farmer entity
   * @param user - User entity
   * @param walletBalance - Wallet balance in naira
   * @returns Farmer detail DTO
   */
  private transformToFarmerDetailDto(
    farmer: FarmerDocument,
    user: UserDocument,
    walletBalance: number = 0,
  ): FarmerDetailDto {
    return plainToInstance(
      FarmerDetailDto,
      {
        id: String(farmer._id),
        userId: String(user._id),
        firstName: farmer.first_name,
        lastName: farmer.last_name,
        fullName: farmer.full_name,
        phone: user.phone,
        lga: farmer.lga,
        farmSizeHectares: farmer.farm_size_hectares,
        totalSales: farmer.total_sales,
        totalEarnings: farmer.total_earnings,
        completedSales: farmer.completed_sales,
        loanDefaults: farmer.loan_defaults,
        activeLoan: farmer.active_loan,
        walletBalance,
        status: user.status,
        createdAt: farmer.createdAt,
        updatedAt: farmer.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Transform buyer and user to buyer detail DTO
   *
   * @param buyer - Buyer entity
   * @param user - User entity
   * @returns Buyer detail DTO
   */
  private transformToBuyerDetailDto(
    buyer: BuyerDocument,
    user: UserDocument,
  ): BuyerDetailDto {
    return plainToInstance(
      BuyerDetailDto,
      {
        id: String(buyer._id),
        userId: String(user._id),
        firstName: buyer.first_name,
        lastName: buyer.last_name,
        fullName: buyer.full_name,
        phone: user.phone,
        businessName: buyer.business_name,
        lga: buyer.lga,
        buyerType: buyer.buyer_type,
        totalPurchases: buyer.total_purchases,
        totalSpent: buyer.total_spent,
        completedOrders: buyer.completed_orders,
        averageRating: buyer.average_rating,
        totalRatings: buyer.total_ratings,
        status: user.status,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Inject wallet service (to avoid circular dependency)
   */
  setWalletService(walletService: any): void {
    this.walletService = walletService;
  }

  /**
   * Admin fund user wallet
   *
   * @param fundWalletDto - Fund wallet data
   * @returns Success response with updated wallet
   */
  async fundUserWallet(fundWalletDto: {
    userId: string;
    amount: number;
    reason: string;
  }): Promise<{ message: string; wallet: any }> {
    this.logger.log(`Admin funding wallet for user: ${fundWalletDto.userId}`);

    if (!this.walletService) {
      throw new BadRequestException('Wallet service not available');
    }

    // Convert amount from Naira to kobo
    const amountInKobo = Math.round(fundWalletDto.amount * 100);

    // Validate amount
    if (amountInKobo < 10000) {
      // Minimum ₦100
      throw new BadRequestException('Minimum funding amount is ₦100');
    }

    try {
      const wallet = await this.walletService.adminFundWallet(
        fundWalletDto.userId,
        amountInKobo,
        fundWalletDto.reason,
      );

      this.logger.log(
        `Wallet funded successfully for user: ${fundWalletDto.userId}`,
      );

      return {
        message: 'Wallet funded successfully',
        wallet: {
          balance: wallet.balance / 100, // Convert back to Naira
          escrowBalance: wallet.escrow_balance / 100,
          savingsBalance: wallet.savings_balance / 100,
          totalDeposited: wallet.total_deposited / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error funding wallet: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Admin fund organization wallet
   *
   * @param fundWalletDto - Funding data
   * @returns Success response with updated wallet
   */
  async fundOrganizationWallet(fundWalletDto: {
    amount: number;
    reason?: string;
  }): Promise<{ message: string; wallet: any }> {
    this.logger.log(
      `Admin funding organization wallet: ₦${fundWalletDto.amount}`,
    );

    if (!this.walletService) {
      throw new BadRequestException('Wallet service not available');
    }

    // Convert amount from Naira to kobo
    const amountInKobo = Math.round(fundWalletDto.amount * 100);

    // Validate amount
    if (amountInKobo < 100000) {
      // Minimum ₦1,000
      throw new BadRequestException('Minimum funding amount is ₦1,000');
    }

    try {
      const wallet = await this.walletService.fundOrganizationWallet(
        amountInKobo,
        fundWalletDto.reason,
      );

      this.logger.log('Organization wallet funded successfully');

      return {
        message: 'Organization wallet funded successfully',
        wallet: {
          balance: wallet.balance / 100, // Convert back to Naira
          totalDeposited: wallet.total_deposited / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error funding organization wallet: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Admin set user withdrawal account
   *
   * @param setAccountDto - Set account data
   * @returns Success response with updated wallet
   */
  async setUserWithdrawalAccount(setAccountDto: {
    userId: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    bvn?: string;
  }): Promise<{ message: string; wallet: any }> {
    this.logger.log(
      `Admin setting withdrawal account for user: ${setAccountDto.userId}`,
    );

    if (!this.walletService) {
      throw new BadRequestException('Wallet service not available');
    }

    try {
      const wallet = await this.walletService.setWithdrawalAccount(
        setAccountDto.userId,
        {
          bank_name: setAccountDto.bankName,
          bank_code: setAccountDto.bankCode,
          account_number: setAccountDto.accountNumber,
          account_name: setAccountDto.accountName,
          bvn: setAccountDto.bvn,
        },
      );

      this.logger.log(
        `Withdrawal account set successfully for user: ${setAccountDto.userId}`,
      );

      return {
        message: 'Withdrawal account set successfully',
        wallet: {
          bankName: wallet.bank_name,
          accountNumber: wallet.account_number,
          accountName: wallet.account_name,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error setting withdrawal account: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Create a product (admin)
   */
  async createProduct(
    createDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Creating product: ${createDto.productName}`);
    const product = await this.productRepository.create(createDto as any);
    return plainToInstance(ProductResponseDto, {
      id: String((product as any)._id),
      productName: (product as any).product_name,
      priceForFarmers: (product as any).price_for_farmers / 100, // Convert kobo to Naira
      priceForMarket: (product as any).price_for_market / 100, // Convert kobo to Naira
      size: (product as any).size,
      isActive: (product as any).is_active,
      createdAt: (product as any).createdAt,
      updatedAt: (product as any).updatedAt,
    });
  }

  /**
   * Get all products with pagination and search
   */
  async getAllProducts(filters: GetProductsDto = {}): Promise<{
    products: ProductResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.productRepository.findWithPagination(filters);
    const products = result.products.map((p) =>
      plainToInstance(ProductResponseDto, {
        id: String((p as any)._id),
        productName: (p as any).product_name,
        priceForFarmers: (p as any).price_for_farmers / 100, // Convert kobo to Naira
        priceForMarket: (p as any).price_for_market / 100, // Convert kobo to Naira
        size: (p as any).size,
        isActive: (p as any).is_active,
        createdAt: (p as any).createdAt,
        updatedAt: (p as any).updatedAt,
      }),
    );

    return {
      products,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get product by id
   */
  async getProductById(id: string): Promise<ProductResponseDto> {
    const p = await this.productRepository.findById(id);
    if (!p) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return plainToInstance(ProductResponseDto, {
      id: String((p as any)._id),
      productName: (p as any).product_name,
      priceForFarmers: (p as any).price_for_farmers / 100, // Convert kobo to Naira
      priceForMarket: (p as any).price_for_market / 100, // Convert kobo to Naira
      size: (p as any).size,
      isActive: (p as any).is_active,
      createdAt: (p as any).createdAt,
      updatedAt: (p as any).updatedAt,
    });
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    updateDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const updated = await this.productRepository.update(id, updateDto as any);
    if (!updated) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return plainToInstance(ProductResponseDto, {
      id: String((updated as any)._id),
      productName: (updated as any).product_name,
      priceForFarmers: (updated as any).price_for_farmers / 100, // Convert kobo to Naira
      priceForMarket: (updated as any).price_for_market / 100, // Convert kobo to Naira
      size: (updated as any).size,
      isActive: (updated as any).is_active,
      createdAt: (updated as any).createdAt,
      updatedAt: (updated as any).updatedAt,
    });
  }

  /**
   * Delete a product (admin)
   */
  async deleteProduct(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting product: ${id}`);

    // Check if product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const deleted = await this.productRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Failed to delete product');
    }

    this.logger.log(`Product deleted successfully: ${id}`);
    return { message: 'Product deleted successfully' };
  }

  // ================================
  // LOAN MANAGEMENT
  // ================================

  /**
   * Get loan KPIs
   */
  async getLoanKPIs(): Promise<AdminLoanKPIsDto> {
    this.logger.log('Fetching loan KPIs');

    const [
      totalRequests,
      pendingRequests,
      approvedLoans,
      activeLoans,
      completedLoans,
      defaultedLoans,
      outstandingResult,
      disbursedResult,
    ] = await Promise.all([
      this.loanModel.countDocuments().exec(),
      this.loanModel.countDocuments({ status: 'requested' }).exec(),
      this.loanModel.countDocuments({ status: 'approved' }).exec(),
      this.loanModel.countDocuments({ status: 'active' }).exec(),
      this.loanModel.countDocuments({ status: 'completed' }).exec(),
      this.loanModel.countDocuments({ status: 'defaulted' }).exec(),
      this.loanModel
        .aggregate([
          { $match: { status: { $in: ['active', 'approved'] } } },
          { $group: { _id: null, total: { $sum: '$amount_outstanding' } } },
        ])
        .exec(),
      this.loanModel
        .aggregate([
          { $match: { status: { $in: ['active', 'completed', 'defaulted'] } } },
          { $group: { _id: null, total: { $sum: '$principal_amount' } } },
        ])
        .exec(),
    ]);

    const totalOutstanding = outstandingResult[0]?.total || 0;
    const totalDisbursed = disbursedResult[0]?.total || 0;
    const defaultRate =
      totalRequests > 0 ? (defaultedLoans / totalRequests) * 100 : 0;

    return {
      totalLoanRequests: totalRequests,
      pendingRequests,
      approvedLoans,
      activeLoans,
      completedLoans,
      defaultedLoans,
      totalOutstanding: Math.round(totalOutstanding / 100), // Convert kobo to naira
      totalDisbursed: Math.round(totalDisbursed / 100), // Convert kobo to naira
      defaultRate: Math.round(defaultRate * 100) / 100,
    };
  }

  /**
   * Get all loans with pagination and filters
   */
  async getAllLoans(filters: GetLoansDto): Promise<{
    loans: AdminLoanResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log(`Fetching loans with filters: ${JSON.stringify(filters)}`);

    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { farmer_name: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [loans, total] = await Promise.all([
      this.loanModel
        .find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.loanModel.countDocuments(query).exec(),
    ]);

    const transformedLoans = await Promise.all(
      loans.map((loan) => this.transformToAdminLoanResponse(loan)),
    );

    return {
      loans: transformedLoans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get loan requests (pending and recently approved)
   */
  async getLoanRequests(filters: GetLoansDto): Promise<{
    loanRequests: AdminLoanResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Fetching loan requests');

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));

    const { loans, total } = await this.loanRepository.findLoanRequests({
      page,
      limit,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder as 'asc' | 'desc',
    });

    const totalPages = Math.ceil(total / limit);

    return {
      loanRequests: await Promise.all(
        loans.map((loan) => this.transformToAdminLoanResponse(loan)),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get loan by ID
   */
  async getLoanById(id: string): Promise<AdminLoanResponseDto> {
    this.logger.log(`Fetching loan by ID: ${id}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return this.transformToAdminLoanResponse(loan);
  }

  /**
   * Create a new loan
   */
  async createLoan(
    createLoanDto: CreateLoanDto,
  ): Promise<AdminLoanResponseDto> {
    this.logger.log(`Creating loan for farmer: ${createLoanDto.farmer_id}`);

    // Verify farmer exists
    const farmer = await this.farmerModel
      .findById(createLoanDto.farmer_id)
      .populate('user_id')
      .exec();
    if (!farmer) {
      throw new NotFoundException(
        `Farmer with ID ${createLoanDto.farmer_id} not found`,
      );
    }

    // Fetch loan type to get required information
    const loanType = await this.loanTypeModel
      .findById(createLoanDto.loan_type_id)
      .exec();
    if (!loanType) {
      throw new NotFoundException(
        `Loan type with ID ${createLoanDto.loan_type_id} not found`,
      );
    }

    if (!loanType.is_active) {
      throw new BadRequestException(
        `Loan type "${loanType.name}" is not currently active`,
      );
    }

    // Generate unique reference
    const reference = await this.generateLoanReference();

    // Convert due date to proper Date object
    const dueDate = new Date(createLoanDto.due_date);
    if (isNaN(dueDate.getTime())) {
      throw new BadRequestException('Invalid due date provided');
    }

    const loanData = {
      farmer_id: createLoanDto.farmer_id,
      loan_type_id: createLoanDto.loan_type_id,
      loan_type_name: loanType.name,
      farmer_name: `${farmer.first_name} ${farmer.last_name}`,
      farmer_phone: PhoneUtil.formatUserPhone(farmer.user_id as any),
      principal_amount: createLoanDto.principal_amount, // Already in kobo from frontend
      interest_rate: loanType.interest_rate,
      duration_months: loanType.duration_months,
      items:
        createLoanDto.items?.map((item) => ({
          ...item,
          unit_price: item.unit_price, // Already in kobo from frontend
          total_price: item.total_price, // Already in kobo from frontend
        })) || [],
      purpose:
        createLoanDto.purpose ||
        `Loan for ${loanType.category.replace('_', ' ')}`,
      due_date: dueDate,
      monthly_payment: createLoanDto.monthly_payment || 0, // Will be auto-calculated if 0
      reference,
      status: 'approved' as const,
      approved_at: new Date(),
    };

    const loan = await this.loanRepository.create(loanData as any);
    return this.transformToAdminLoanResponse(loan);
  }

  /**
   * Approve a loan request and create active loan
   */
  async approveLoanRequest(
    id: string,
    approveDto: AdminApproveLoanRequestDto,
  ): Promise<AdminLoanResponseDto> {
    this.logger.log(`Approving loan request: ${id}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan request with ID ${id} not found`);
    }

    if (loan.status !== 'requested') {
      throw new BadRequestException(
        `Cannot approve loan with status: ${loan.status}. Only 'requested' loans can be approved.`,
      );
    }

    // Validate pickup date
    const pickupDate = new Date(approveDto.pickup_date);
    if (pickupDate <= new Date()) {
      throw new BadRequestException('Pickup date must be in the future');
    }

    // Validate that staff/farmer doesn't have too many active loans
    let entityId: string | undefined;
    let entityType: 'farmer' | 'staff' = 'farmer';
    if (loan.staff_id) {
      entityId = loan.staff_id?.toString();
      entityType = 'staff';
    } else if (loan.farmer_id) {
      entityId =
        (loan.farmer_id as any)?._id?.toString() || loan.farmer_id?.toString();
      entityType = 'farmer';
    }
    if (!entityId) {
      throw new BadRequestException('Loan is missing staff_id or farmer_id.');
    }
    const activeLoanCount = await this.loanRepository.getFarmerLoanCount(
      entityId,
      'active',
    );

    if (activeLoanCount >= 3) {
      throw new BadRequestException(
        `${entityType === 'staff' ? 'Staff' : 'Farmer'} already has ${activeLoanCount} active loans. Maximum allowed is 3.`,
      );
    }

    try {
      // Create the active loan by updating the loan request
      const updatedLoan = await this.createActiveLoanFromRequest(
        loan,
        approveDto,
      );

      // --- handle optional staff salary deduction and staff wallet credit ---
      if (approveDto.salaryDebitPercent && updatedLoan.staff_id) {
        // findStaffById returns { user, staff } — call it staffResult
        const staffResult = await this.staffRepository.findStaffById(
          String(updatedLoan.staff_id),
        );

        const staffDoc = staffResult?.staff ?? undefined;

        // monthly_salary is stored in kobo per your Staff schema
        if (
          staffDoc &&
          typeof staffDoc.monthly_salary === 'number' &&
          staffDoc.monthly_salary > 0
        ) {
          updatedLoan.salary_debit_percent = approveDto.salaryDebitPercent;

          // monthly_salary is in kobo — result will be in kobo too
          updatedLoan.salary_monthly_debit = Math.round(
            (staffDoc.monthly_salary * approveDto.salaryDebitPercent) / 100,
          );
        }
      }

      // Credit staff wallet with principal amount (only if walletSvc is available)
      if (
        this.walletService &&
        updatedLoan.user_id &&
        updatedLoan.principal_amount
      ) {
        try {
          await this.walletService.adminFundWallet(
            String(updatedLoan.user_id),
            updatedLoan.principal_amount,
            'Staff loan disbursement',
          );
        } catch (err) {
          this.logger.error(
            `Failed to credit staff wallet: ${err?.message ?? err}`,
          );
        }
      }

      // Send SMS notification to staff or farmer on loan approval
      try {
        // Get user details for SMS
        let userDetails: any = null;
        if (entityType === 'staff') {
          userDetails = await this.staffRepository.findStaffById(entityId);
        } else {
          userDetails = await this.farmerRepository.findFarmerById(entityId);
        }
        const user = userDetails?.user;
        const name = user?.first_name || user?.full_name || 'User';
        const phone = user?.phone;
        if (name && phone && this.smsService?.sendLoanApprovalSms) {
          await this.smsService.sendLoanApprovalSms({
            name,
            phone,
            reference: updatedLoan.reference,
            amount: updatedLoan.principal_amount,
            pickupDate: updatedLoan.pickup_date,
            pickupLocation: updatedLoan.pickup_location,
            monthlyPayment: updatedLoan.monthly_payment,
            notes: updatedLoan.notes,
          });
          this.logger.log(`Loan approval SMS sent to ${phone}`);
        } else {
          this.logger.warn(
            'Could not send loan approval SMS: missing user details or smsService',
          );
        }
      } catch (smsErr) {
        this.logger.error(
          `Failed to send loan approval SMS: ${smsErr?.message ?? smsErr}`,
        );
      }

      // Send SMS notification
      await this.sendLoanApprovalSMS(updatedLoan, approveDto);

      this.logger.log(
        `Loan request ${id} approved and active loan created successfully`,
      );
      return await this.transformToAdminLoanResponse(updatedLoan);
    } catch (error) {
      this.logger.error(`Failed to approve loan request ${id}:`, error.message);

      // If it's a validation error, throw it as is
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // For other errors, wrap in a generic error
      throw new BadRequestException(
        `Failed to approve loan request: ${error.message}`,
      );
    }
  }

  /**
   * Private method to create active loan from approved request
   */
  private async createActiveLoanFromRequest(
    loanRequest: any,
    approveDto: AdminApproveLoanRequestDto,
  ): Promise<any> {
    const pickupDate = new Date(approveDto.pickup_date);

    // Calculate when the loan becomes active (pickup date + 1 day grace period)
    const loanActivationDate = new Date(pickupDate);
    loanActivationDate.setDate(loanActivationDate.getDate() + 1);

    // Calculate due date (pickup date + duration months)
    const dueDate = new Date(pickupDate);
    dueDate.setMonth(dueDate.getMonth() + loanRequest.duration_months);

    // Update the loan request to approved status first
    loanRequest.status = 'approved';
    loanRequest.approved_at = new Date();
    loanRequest.pickup_date = pickupDate;
    loanRequest.pickup_location = approveDto.pickup_location || 'Main Office';
    loanRequest.due_date = dueDate;
    loanRequest.disbursed_at = new Date(); // Mark as disbursed when approved

    // Ensure all calculated fields are set
    if (!loanRequest.interest_amount) {
      loanRequest.interest_amount = Math.round(
        (loanRequest.principal_amount * loanRequest.interest_rate) / 100,
      );
    }

    if (!loanRequest.total_repayment) {
      loanRequest.total_repayment =
        loanRequest.principal_amount + loanRequest.interest_amount;
    }

    if (!loanRequest.monthly_payment) {
      loanRequest.monthly_payment = Math.round(
        loanRequest.total_repayment / loanRequest.duration_months,
      );
    }

    loanRequest.amount_outstanding = loanRequest.total_repayment;

    // Add admin notes if provided
    if (approveDto.admin_notes) {
      loanRequest.admin_notes = approveDto.admin_notes;
    }

    return await loanRequest.save();
  }

  /**
   * Private method to send loan approval SMS
   */
  private async sendLoanApprovalSMS(
    loan: any,
    approveDto: AdminApproveLoanRequestDto,
  ): Promise<void> {
    try {
      let name: string;
      let phone: string;

      if (loan.staff_id) {
        // This is a staff loan
        const staffData = await this.staffRepository.findStaffById(
          loan.staff_id,
        );
        if (!staffData) {
          throw new Error(`Staff with ID ${loan.staff_id} not found`);
        }
        name = `${staffData.staff.first_name} ${staffData.staff.last_name}`;
        phone = staffData.user.phone;
      } else {
        // This is a farmer loan
        name = loan.farmer_name;
        phone = loan.farmer_phone;
      }

      // Ensure phone number is properly formatted
      const formattedPhone = PhoneUtil.isValidPhoneNumber(phone)
        ? phone
        : PhoneUtil.formatPhoneNumber(phone);

      await this.smsService.sendLoanApprovalSms({
        name,
        phone: formattedPhone,
        reference: loan.reference,
        amount: loan.principal_amount,
        pickupDate: loan.pickup_date,
        pickupLocation: loan.pickup_location,
        monthlyPayment: loan.monthly_payment,
        notes: approveDto.admin_notes,
      });

      this.logger.log(
        `Loan approval SMS sent to ${loan.staff_id ? 'staff' : 'farmer'} ${formattedPhone} for loan ${loan.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send loan approval SMS to ${loan.staff_id ? 'staff' : 'farmer'} ${loan.staff_id ? loan.staff_id : loan.farmer_phone}: ${error.message}.`,
        error.stack,
      );
      // Don't throw error for SMS failure - loan approval should still succeed
    }
  }

  /**
   * Activate an approved loan (when farmer picks up inputs)
   */
  async activateLoan(id: string): Promise<AdminLoanResponseDto> {
    this.logger.log(`Activating loan: ${id}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    if (loan.status !== 'approved') {
      throw new BadRequestException(
        `Cannot activate loan with status: ${loan.status}. Only 'approved' loans can be activated.`,
      );
    }

    // Check if pickup date has passed
    if (loan.pickup_date && new Date() < loan.pickup_date) {
      throw new BadRequestException(
        `Cannot activate loan before pickup date: ${loan.pickup_date.toDateString()}`,
      );
    }

    try {
      // Update loan to active status
      loan.status = 'active';
      loan.disbursed_at = new Date(); // Update disbursement date to actual pickup

      const activatedLoan = await loan.save();

      // Send activation SMS
      await this.sendLoanActivationSMS(activatedLoan);

      this.logger.log(`Loan ${id} activated successfully`);
      return await this.transformToAdminLoanResponse(activatedLoan);
    } catch (error) {
      this.logger.error(`Failed to activate loan ${id}:`, error.message);
      throw new BadRequestException(
        `Failed to activate loan: ${error.message}`,
      );
    }
  }

  /**
   * Private method to send loan activation SMS
   */
  private async sendLoanActivationSMS(loan: any): Promise<void> {
    try {
      const dueDate = loan.due_date.toLocaleDateString('en-GB');

      let smsMessage = `Dear ${loan.farmer_name}, your loan (${loan.reference}) is now ACTIVE! `;
      smsMessage += `Amount: ₦${(loan.principal_amount / 100).toLocaleString()}. `;
      smsMessage += `Monthly payment: ₦${(loan.monthly_payment / 100).toLocaleString()}. `;
      smsMessage += `Final due date: ${dueDate}. Thank you for choosing FarmConnect!`;

      const formattedPhone = PhoneUtil.isValidPhoneNumber(loan.farmer_phone)
        ? loan.farmer_phone
        : PhoneUtil.formatPhoneNumber(loan.farmer_phone);

      await this.smsService.sendSms({
        to: formattedPhone,
        message: smsMessage,
        messageType: 'loan_approved',
      });

      this.logger.log(
        `Activation SMS sent to farmer ${formattedPhone} for loan ${loan.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send activation SMS to farmer ${loan.farmer_phone}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Generate unique loan reference
   */
  private async generateLoanReference(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const datePrefix = `LOAN${year}${month}${day}`;

    // Find the highest sequence number for today
    const lastLoan = await this.loanModel
      .findOne({ reference: { $regex: `^${datePrefix}` } })
      .sort({ reference: -1 })
      .exec();

    let sequenceNumber = 1;
    if (lastLoan) {
      const lastSequence = parseInt(lastLoan.reference.slice(-3));
      sequenceNumber = lastSequence + 1;
    }

    return `${datePrefix}${sequenceNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Transform loan document to admin response DTO
   */
  private async transformToAdminLoanResponse(
    loan: any,
  ): Promise<AdminLoanResponseDto> {
    let user_id = '';
    let user_type: 'farmer' | 'staff' = 'farmer';
    let name = '';
    let phone = '';

    // Handle staff loans
    if (loan.staff_id) {
      const staffData = await this.staffRepository.findStaffById(loan.staff_id);
      if (staffData) {
        user_id = loan.staff_id.toString();
        user_type = 'staff';
        name = `${staffData.staff.first_name} ${staffData.staff.last_name}`;
        phone = staffData.user.phone;
      }
    } else if (loan.farmer_id) {
      // Handle farmer loans
      user_id = loan.farmer_id.toString();
      user_type = 'farmer';
      name = loan.farmer_name || '';
      phone = loan.farmer_phone || '';
    }

    return {
      id: loan._id?.toString() || loan.id,
      user_id,
      user_type,
      name,
      phone,
      loan_type_name: loan.loan_type_name,
      principal_amount: Math.round(loan.principal_amount / 100), // Convert kobo to naira
      interest_rate: loan.interest_rate,
      interest_amount: Math.round(loan.interest_amount / 100),
      total_repayment: Math.round(loan.total_repayment / 100),
      purpose: loan.purpose,
      duration_months: loan.duration_months,
      monthly_payment: Math.round(loan.monthly_payment / 100),
      amount_paid: Math.round(loan.amount_paid / 100),
      amount_outstanding: Math.round(loan.amount_outstanding / 100),
      status: loan.status,
      reference: loan.reference,
      pickup_date: loan.pickup_date,
      pickup_location: loan.pickup_location,
      approved_at: loan.approved_at,
      disbursed_at: loan.disbursed_at,
      due_date: loan.due_date,
      completed_at: loan.completed_at,
      defaulted_at: loan.defaulted_at,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      items: loan.items || [],
    };
  }

  /**
   * Get system settings
   * Creates default settings if none exist
   */
  async getSettings(): Promise<SettingsResponseDto> {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = await this.settingsModel.create({
        cassavaPricePerKg: 50000, // 500 naira in kobo
        cassavaPricePerTon: 45000000, // 450,000 naira in kobo
      });
    }

    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Create initial system settings
   * Only creates if no settings exist
   */
  async createSettings(
    createSettingsDto: CreateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const existingSettings = await this.settingsModel.findOne();

    if (existingSettings) {
      throw new BadRequestException(
        'Settings already exist. Use update instead.',
      );
    }

    const settings = await this.settingsModel.create({
      cassavaPricePerKg: createSettingsDto.cassavaPricePerKg || 50000,
      cassavaPricePerTon: createSettingsDto.cassavaPricePerTon || 45000000,
      lastUpdated: new Date(),
    });

    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update system settings
   */
  async updateSettings(
    updateSettingsDto: any,
    adminId: string,
  ): Promise<SettingsResponseDto> {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = await this.settingsModel.create({
        cassavaPricePerKg: updateSettingsDto.cassavaPricePerKg || 50000,
        cassavaPricePerTon: updateSettingsDto.cassavaPricePerTon || 45000000,
        lastUpdated: new Date(),
        updatedBy: adminId,
      });
    } else {
      // Update existing settings
      if (updateSettingsDto.cassavaPricePerKg !== undefined) {
        settings.cassavaPricePerKg = updateSettingsDto.cassavaPricePerKg;
      }
      if (updateSettingsDto.cassavaPricePerTon !== undefined) {
        settings.cassavaPricePerTon = updateSettingsDto.cassavaPricePerTon;
      }

      settings.lastUpdated = new Date();
      settings.updatedBy = adminId;
      settings.updatedAt = new Date();

      await settings.save();
    }

    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Create organization wallet for salary management
   */
  async createOrganizationWallet(organizationName: string): Promise<any> {
    if (!this.walletService) {
      throw new BadRequestException('Wallet service not available');
    }

    try {
      const wallet =
        await this.walletService.createOrganizationWallet(organizationName);

      return {
        success: true,
        message: 'Organization wallet created successfully',
        data: wallet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create organization wallet: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get organization wallet
   */
  async getOrganizationWallet(): Promise<any> {
    if (!this.walletService) {
      throw new BadRequestException('Wallet service not available');
    }

    try {
      const wallet = await this.walletService.getOrganizationWallet();

      if (!wallet) {
        throw new NotFoundException(
          'Organization wallet not found. Please create one first.',
        );
      }

      return {
        success: true,
        message: 'Organization wallet retrieved successfully',
        data: wallet,
      };
    } catch (error) {
      this.logger.error(`Failed to get organization wallet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request password reset - send OTP via SMS
   */
  async requestPasswordReset(
    requestDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Password reset requested for: ${requestDto.phone}`);

    // Normalize phone number
    const { phone: normalizedPhone } = normalizePhoneNumber(requestDto.phone);

    // Find admin by phone number
    const admin = await this.adminRepository.findByPhone(normalizedPhone);
    if (!admin) {
      throw new NotFoundException(
        'No admin account found with this phone number.',
      );
    }

    // Check if admin is active
    if (!(admin as any).is_active) {
      throw new BadRequestException('Admin account is inactive.');
    }

    // Check if OTP already sent recently
    if (this.otpService.hasActiveOtp(normalizedPhone)) {
      throw new BadRequestException(
        'OTP already sent recently. Please wait before requesting again.',
      );
    }

    // Generate OTP
    const otp = this.otpService.generateOtp(normalizedPhone);

    // Send SMS
    const message = `Your FarmConnect admin password reset code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;

    try {
      await this.smsService.sendSms({
        to: normalizedPhone,
        message: message,
        messageType: 'registration', // Using existing message type for password reset
      });
      this.logger.log(`Password reset OTP sent to ${normalizedPhone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset SMS: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Failed to send OTP. Please try again later.',
      );
    }

    return {
      message: 'OTP sent successfully to your phone number.',
    };
  }

  /**
   * Verify OTP and reset password
   */
  async verifyPasswordReset(
    verifyDto: VerifyPasswordResetDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Password reset verification for: ${verifyDto.phone}`);

    // Normalize phone number
    const { phone: normalizedPhone } = normalizePhoneNumber(verifyDto.phone);

    // Verify OTP
    if (!this.otpService.verifyOtp(normalizedPhone, verifyDto.otp)) {
      throw new BadRequestException('Invalid or expired OTP code.');
    }

    // Find admin by phone number
    const admin = await this.adminRepository.findByPhone(normalizedPhone);
    if (!admin) {
      throw new NotFoundException(
        'No admin account found with this phone number.',
      );
    }

    // Check if admin is active
    if (!(admin as any).is_active) {
      throw new BadRequestException('Admin account is inactive.');
    }

    // Validate password strength
    if (!isStrongPassword(verifyDto.newPassword)) {
      throw new BadRequestException(
        'Password must contain at least 8 characters with uppercase, lowercase, number and special character.',
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(verifyDto.newPassword);

    // Update admin password
    const updatedAdmin = await this.adminRepository.update(
      String((admin as any)._id),
      { password: hashedPassword } as any,
    );

    if (!updatedAdmin) {
      throw new NotFoundException('Failed to update password.');
    }

    this.logger.log(`Password reset successful for: ${normalizedPhone}`);

    // Send confirmation SMS
    try {
      await this.smsService.sendSms({
        to: normalizedPhone,
        message:
          'Your FarmConnect admin password has been reset successfully. If you did not request this, please contact support immediately.',
        messageType: 'registration', // Using existing message type for password reset confirmation
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset confirmation SMS: ${(error as Error).message}`,
      );
      // Don't throw error as password reset was successful
    }

    return { message: 'Password reset successfully.' };
  }
}
