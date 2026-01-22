// src/modules/staff/staff.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types, Schema as MongooseSchema } from 'mongoose';
import { StaffRepository } from './staff.repository';
import { JwtService } from '@nestjs/jwt';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DeactivateStaffDto } from './dto/deactivate-staff.dto';
import { WalletService } from '../wallet/wallet.service';
import { normalizePhoneNumber } from '../../common/utils/pin.util';
import { comparePin, hashPin, isValidPin } from '../../common/utils/pin.util';
import { InvalidPinException } from '../../common/exceptions/invalid-pin.exception';
import { LoanService } from '../loan/loan.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import { PaystackService } from '../wallet/paystack.service';
import { SmsService } from '../../common/services/sms.service';
import { OtpService } from '../../common/services/otp.service';
import { RequestPinResetDto, VerifyPinResetDto } from './dto/pin-reset.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
    private readonly loanService: LoanService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Register a new staff member (via USSD or API)
   * Staff will be inactive until approved
   *
   * @param registerDto - Registration data
   * @returns Created staff
   */
  async register(registerDto: RegisterStaffDto): Promise<any> {
    this.logger.log(`Registering staff: ${registerDto.phone}`);

    // Normalize phone number
    const { phone: normalizedPhone } = normalizePhoneNumber(registerDto.phone);

    // Check if phone already exists
    const existingUser =
      await this.staffRepository.findUserByPhone(normalizedPhone);
    if (existingUser) {
      throw new BadRequestException('Phone number already registered');
    }

    // Create staff
    const { user, staff } = await this.staffRepository.createStaff({
      ...registerDto,
      phone: normalizedPhone,
    });

    this.logger.log(`Staff registered successfully: ${staff.employee_id}`);

    return {
      id: staff._id,
      userId: user._id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
      monthlySalary: staff.monthly_salary,
      createdAt: staff.createdAt,
    };
  }

  /**
   * Add or update staff BVN
   */
  async addBvn(userId: string, bvn: string): Promise<any> {
    if (!/^\d{11}$/.test(bvn)) {
      throw new BadRequestException('BVN must be exactly 11 digits');
    }
    const staff = await this.staffRepository.findStaffByUserId(userId);
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    staff.bvn = bvn;
    await staff.save();
    return { bvn: staff.bvn };
  }

  /**
   * Add or update staff NIN
   */
  async addNin(userId: string, nin: string): Promise<any> {
    // Basic URL validation (Cloudinary URLs start with https://)
    if (!nin.startsWith('https://')) {
      throw new BadRequestException('NIN must be a valid Cloudinary URL');
    }
    const staff = await this.staffRepository.findStaffByUserId(userId);
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    staff.nin = nin;
    await staff.save();
    return { nin: staff.nin };
  }

  /**
   * Staff login with phone and PIN
   */
  async login(loginDto: LoginStaffDto): Promise<any> {
    this.logger.log(`Staff login attempt: ${loginDto.phone}`);

    const { phone: normalizedPhone } = normalizePhoneNumber(loginDto.phone);

    // Find user
    const user = await this.staffRepository.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new InvalidPinException();
    }

    // Ensure user is staff
    if (user.user_type !== 'staff') {
      throw new InvalidPinException();
    }

    // Fetch staff profile and check active/approved flags (use profile as source of truth)
    const staff = await this.staffRepository.findStaffByUserId(
      user._id.toString(),
    );
    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    if (!staff.is_active || !staff.is_approved) {
      throw new BadRequestException('Account is suspended or not active');
    }

    // Verify PIN
    const isPinValid = await comparePin(loginDto.pin, user.password);
    if (!isPinValid) {
      throw new InvalidPinException();
    }

    // Update last login/activity
    await this.staffRepository.updateUser(user._id.toString(), {
      last_login: new Date(),
      last_activity: new Date(),
    } as any);

    this.logger.log(`Staff logged in successfully: ${user.phone}`);

    const payload = {
      sub: String(user._id),
      phone: user.phone,
      role: staff.role,
      type: 'staff',
    } as const;

    const accessToken = this.jwtService.sign(payload as any);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
      staff: {
        id: staff._id,
        userId: user._id,
        phone: user.phone,
        firstName: staff.first_name,
        lastName: staff.last_name,
        fullName: staff.full_name,
        lga: staff.lga,
        role: staff.role,
        department: staff.department,
        employeeId: staff.employee_id,
        isActive: staff.is_active,
        isApproved: staff.is_approved,
      },
    };
  }

  /**
   * Change staff PIN
   *
   * @param staffId - Staff ID
   * @param changePinDto - PIN change data
   * @returns Updated staff
   */
  async changePin(staffId: string, changePinDto: ChangePinDto): Promise<any> {
    this.logger.log(`Changing PIN for staff: ${staffId}`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { user, staff } = staffData;

    // Check if staff is active
    if (!staff.is_active || !staff.is_approved) {
      throw new BadRequestException('Staff account is not active');
    }

    // Verify current PIN
    const isCurrentPinValid = await comparePin(
      changePinDto.currentPin,
      user.password,
    );
    if (!isCurrentPinValid) {
      throw new BadRequestException('Current PIN is incorrect');
    }

    // Validate new PIN
    if (!isValidPin(changePinDto.newPin)) {
      throw new BadRequestException('New PIN must be exactly 4 digits');
    }

    // Check if new PIN is different from current
    if (changePinDto.newPin === changePinDto.currentPin) {
      throw new BadRequestException(
        'New PIN must be different from current PIN',
      );
    }

    // Hash new PIN
    const hashedPin = await hashPin(changePinDto.newPin);

    // Update user password
    await this.staffRepository.updateUser(user._id.toString(), {
      password: hashedPin,
    });

    this.logger.log(`PIN changed successfully for staff: ${staffId}`);

    return {
      id: staff._id,
      userId: user._id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
    };
  }

  /**
   * Approve staff and activate account
   * Also creates wallet and pension wallet for the staff
   *
   * @param staffId - Staff ID
   * @param approvedBy - Admin ID who approved
   * @returns Approved staff
   */
  async approveStaff(staffId: string, approvedBy: string): Promise<any> {
    this.logger.log(`Approving staff: ${staffId}`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { user, staff } = staffData;

    // Check if already approved
    if (staff.is_approved) {
      throw new BadRequestException('Staff is already approved');
    }

    // Approve staff
    const approvedByObjectId = new Types.ObjectId(approvedBy);
    const approvedStaff = await this.staffRepository.approveStaff(
      staffId,
      approvedByObjectId,
    );

    if (!approvedStaff) {
      throw new BadRequestException('Failed to approve staff');
    }

    // Create wallet for staff
    try {
      await this.walletService.createWallet(user._id, 'staff');
      this.logger.log(`Wallet created for staff: ${staffId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to create wallet for staff: ${error?.message ?? error}`,
      );
      // Don't fail the approval if wallet creation fails
    }

    this.logger.log(`Staff approved successfully: ${staffId}`);

    return {
      id: approvedStaff._id,
      userId: user._id,
      phone: user.phone,
      firstName: approvedStaff.first_name,
      lastName: approvedStaff.last_name,
      fullName: approvedStaff.full_name,
      lga: approvedStaff.lga,
      role: approvedStaff.role,
      department: approvedStaff.department,
      employeeId: approvedStaff.employee_id,
      isActive: approvedStaff.is_active,
      isApproved: approvedStaff.is_approved,
      dateApproved: approvedStaff.date_approved,
      approvedBy: approvedStaff.approved_by,
      monthlySalary: approvedStaff.monthly_salary,
    };
  }

  /**
   * Get all staff with pagination and filters
   *
   * @param options - Query options
   * @returns Paginated staff list
   */
  async getAllStaff(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
    department?: string;
    is_approved?: boolean;
  }): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const { staff, total } = await this.staffRepository.findAllStaff({
      page,
      limit,
      search: options.search,
      status: options.status,
      role: options.role,
      department: options.department,
      is_approved: options.is_approved,
    });

    const staffList = staff.map(({ user, staff }) => ({
      id: staff._id,
      userId: user._id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
      dateApproved: staff.date_approved,
      monthlySalary: staff.monthly_salary,
      totalSalaryPaid: staff.total_salary_paid,
      pensionContributions: staff.pension_contributions,
      performanceRating: staff.performance_rating,
      nin: staff.nin,
      createdAt: staff.createdAt,
    }));

    return {
      staff: staffList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get profile for the currently authenticated staff user
   * @param userId - User ObjectId string
   */
  async getProfile(userId: string): Promise<any> {
    // Find user by phone is not needed; we have userId
    const staff = await this.staffRepository.findStaffByUserId(userId);
    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    const user = await this.staffRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Attempt to get wallet (may throw NotFoundException)
    let wallet: any = null;
    try {
      wallet = await this.walletService.getWallet(staff.user_id as any);
    } catch (err) {
      // ignore missing wallet
      wallet = null;
    }

    return {
      id: staff._id,
      userId: staff.user_id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
      dateApproved: staff.date_approved,
      monthlySalary: staff.monthly_salary,
      totalSalaryPaid: staff.total_salary_paid,
      pensionContributions: staff.pension_contributions,
      performanceRating: staff.performance_rating,
      verification: {
        // placeholder for verification-related fields if present on staff
        verified: !!staff.is_approved,
        approvedBy: staff.approved_by ?? null,
        verifiedAt: staff.date_approved ?? null,
      },
      hasBvn: !!staff.bvn,
      hasNin: !!staff.nin,
      wallet: wallet
        ? {
            balance: wallet.balance,
            escrow_balance: wallet.escrow_balance,
            savings_balance: wallet.savings_balance,
            bonus_balance: wallet.bonus_balance,
            total_earned: wallet.total_earned,
            bank_name: wallet.bank_name,
            account_number: wallet.account_number,
            account_name: wallet.account_name,
          }
        : null,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }

  /**
   * Get staff by ID
   *
   * @param staffId - Staff ID
   * @returns Staff details
   */
  async getStaffById(staffId: string): Promise<any> {
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { user, staff } = staffData;

    // Get wallet info
    let walletInfo: {
      balance: number;
      pensionBalance: number;
      totalEarned: number;
    } | null = null;
    try {
      const wallet = await this.walletService.getWallet(user._id as any);
      walletInfo = {
        balance: wallet.balance,
        pensionBalance: wallet.pension_balance,
        totalEarned: wallet.total_earned,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to get wallet for staff ${staffId}: ${error?.message ?? error}`,
      );
    }

    return {
      id: staff._id,
      userId: user._id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
      dateApproved: staff.date_approved,
      approvedBy: staff.approved_by,
      monthlySalary: staff.monthly_salary,
      totalSalaryPaid: staff.total_salary_paid,
      pensionContributions: staff.pension_contributions,
      performanceRating: staff.performance_rating,
      deactivationReason: staff.deactivation_reason,
      deactivatedAt: staff.deactivated_at,
      wallet: walletInfo,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }

  /**
   * Get staff by phone number
   *
   * @param phone - Phone number
   * @returns Staff details
   */
  async getStaffByPhone(phone: string): Promise<any> {
    const { phone: normalizedPhone } = normalizePhoneNumber(phone);
    const user = await this.staffRepository.findUserByPhone(normalizedPhone);

    if (!user || user.user_type !== 'staff') {
      throw new NotFoundException('Staff not found');
    }

    const staff = await this.staffRepository.findStaffByUserId(
      user._id.toString(),
    );
    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    return {
      id: staff._id,
      userId: user._id,
      phone: user.phone,
      firstName: staff.first_name,
      lastName: staff.last_name,
      fullName: staff.full_name,
      lga: staff.lga,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      isActive: staff.is_active,
      isApproved: staff.is_approved,
    };
  }

  /**
   * Update staff information
   *
   * @param staffId - Staff ID
   * @param updateDto - Update data
   * @returns Updated staff
   */
  async updateStaff(staffId: string, updateDto: UpdateStaffDto): Promise<any> {
    this.logger.log(`Updating staff: ${staffId}`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    // Build update data
    const updateData: any = {};
    if (updateDto.firstName) updateData.first_name = updateDto.firstName;
    if (updateDto.lastName) updateData.last_name = updateDto.lastName;
    if (updateDto.lga) updateData.lga = updateDto.lga;
    if (updateDto.role) updateData.role = updateDto.role;
    if (updateDto.department) updateData.department = updateDto.department;
    if (updateDto.monthlySalary !== undefined)
      updateData.monthly_salary = updateDto.monthlySalary;

    // Update staff
    const updatedStaff = await this.staffRepository.updateStaff(
      staffId,
      updateData,
    );

    if (!updatedStaff) {
      throw new BadRequestException('Failed to update staff');
    }

    this.logger.log(`Staff updated successfully: ${staffId}`);

    return {
      id: updatedStaff._id,
      firstName: updatedStaff.first_name,
      lastName: updatedStaff.last_name,
      fullName: updatedStaff.full_name,
      lga: updatedStaff.lga,
      role: updatedStaff.role,
      department: updatedStaff.department,
      monthlySalary: updatedStaff.monthly_salary,
    };
  }

  /**
   * Staff requests a personal loan for themselves
   *
   * - Ensures staff exists, is active and approved
   * - Validates duration
   * - Delegates creation to LoanService (createStaffLoan)
   *
   * @param staffId staff id (string)
   * @param createLoanDto request payload
   */
  async requestStaffLoan(
    staffId: string,
    createLoanDto: CreateLoanDto,
  ): Promise<any> {
    this.logger.log(`Staff ${staffId} requesting personal loan`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { staff, user } = staffData;

    // Ensure staff is active and approved
    if (!staff.is_active) {
      throw new BadRequestException('Staff account is not active');
    }
    if (!staff.is_approved) {
      throw new BadRequestException(
        'Staff account is not approved to request loans',
      );
    }

    // Validate durationMonths (ensure it's one of allowed values)
    const allowedDurations = [3, 6, 9, 12];
    if (!allowedDurations.includes(Number(createLoanDto.durationMonths))) {
      throw new BadRequestException(
        'Invalid durationMonths. Allowed values: 3, 6, 9, 12',
      );
    }

    // Optional: Basic eligibility check (example — adjust rules as needed)
    // Example rule: principal cannot exceed 3x monthly salary (if monthly_salary exists)
    if (typeof staff.monthly_salary === 'number' && staff.monthly_salary > 0) {
      const maxAllowed = staff.monthly_salary * 3;
      if (createLoanDto.principalAmount > maxAllowed) {
        throw new BadRequestException(
          `Requested principal exceeds allowed limit (${maxAllowed})`,
        );
      }
    }

    // Build payload for LoanService — convert ids to ObjectId where necessary
    const loanPayload: any = {
      staff_id: new Types.ObjectId(staff._id),
      user_id: new Types.ObjectId(user._id),

      loan_type_id: createLoanDto.loanTypeId
        ? new Types.ObjectId(createLoanDto.loanTypeId)
        : undefined,
      principal_amount: createLoanDto.principalAmount,
      interest_rate: createLoanDto.interestRate,
      purpose: createLoanDto.purpose,
      duration_months: createLoanDto.durationMonths,
      items: createLoanDto.items || [],
      pickup_date: createLoanDto.pickupDate
        ? new Date(createLoanDto.pickupDate)
        : undefined,
      pickup_location: createLoanDto.pickupLocation,
      status: 'requested',
      // amount_paid, amount_outstanding, reference, loan_type_name will typically be calculated in LoanService / Loan schema hooks
    };

    // Delegate to LoanService to create the loan.
    // Implement createStaffLoan(payload) in LoanService (recommended) — it should:
    // - resolve loan_type_name from loan_type_id
    // - generate unique reference
    // - persist the loan via LoanRepository
    let createdLoan: any;
    try {
      if (typeof this.loanService.createStaffLoan === 'function') {
        createdLoan = await this.loanService.createStaffLoan(loanPayload);
      } else if (typeof this.loanService.createLoan === 'function') {
        // fallback to a generic method if present
        createdLoan = await this.loanService.createLoan(loanPayload);
      } else {
        throw new Error(
          'LoanService does not implement createStaffLoan or createLoan',
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to create loan for staff ${staffId}: ${err?.message ?? err}`,
      );
      // bubble up a better exception
      throw new BadRequestException(err?.message ?? 'Failed to create loan');
    }

    // Return a compact response
    return {
      id: createdLoan._id,
      reference: createdLoan.reference,
      status: createdLoan.status,
      principalAmount: createdLoan.principal_amount,
      interestAmount: createdLoan.interest_amount,
      totalRepayment: createdLoan.total_repayment,
      monthlyPayment: createdLoan.monthly_payment,
      dueDate: createdLoan.due_date,
      createdAt: createdLoan.createdAt || createdLoan.created_at,
    };
  }

  /**
   * Deactivate staff
   *
   * @param staffId - Staff ID
   * @param deactivateDto - Deactivation reason
   * @returns Deactivated staff
   */
  async deactivateStaff(
    staffId: string,
    deactivateDto: DeactivateStaffDto,
  ): Promise<any> {
    this.logger.log(`Deactivating staff: ${staffId}`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { staff } = staffData;

    // Check if already deactivated
    if (!staff.is_active) {
      throw new BadRequestException('Staff is already deactivated');
    }

    // Deactivate staff
    const deactivatedStaff = await this.staffRepository.deactivateStaff(
      staffId,
      deactivateDto.reason,
    );

    if (!deactivatedStaff) {
      throw new BadRequestException('Failed to deactivate staff');
    }

    this.logger.log(`Staff deactivated successfully: ${staffId}`);

    return {
      id: deactivatedStaff._id,
      isActive: deactivatedStaff.is_active,
      deactivationReason: deactivatedStaff.deactivation_reason,
      deactivatedAt: deactivatedStaff.deactivated_at,
    };
  }

  /**
   * Reactivate staff
   *
   * @param staffId - Staff ID
   * @returns Reactivated staff
   */
  async reactivateStaff(staffId: string): Promise<any> {
    this.logger.log(`Reactivating staff: ${staffId}`);

    // Find staff
    const staffData = await this.staffRepository.findStaffById(staffId);
    if (!staffData) {
      throw new NotFoundException('Staff not found');
    }

    const { user, staff } = staffData;

    // Check if already active
    if (staff.is_active) {
      throw new BadRequestException('Staff is already active');
    }

    // Check if approved
    if (!staff.is_approved) {
      throw new BadRequestException(
        'Staff must be approved before reactivation',
      );
    }

    // Reactivate staff
    const updatedStaff = await this.staffRepository.updateStaff(staffId, {
      is_active: true,
      deactivation_reason: undefined,
      deactivated_at: undefined,
    } as any);

    // Update user status
    await this.staffRepository.updateUser(user._id.toString(), {
      status: 'active',
    });

    this.logger.log(`Staff reactivated successfully: ${staffId}`);

    return {
      id: updatedStaff!._id,
      isActive: updatedStaff!.is_active,
    };
  }

  /**
   * Get staff wallet
   */
  async getWallet(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return this.walletService.getWallet(userObjectId as any);
  }

  /**
   * Get list of banks
   */
  async getBanks() {
    return this.paystackService.getBankList();
  }

  /**
   * Verify account number
   */
  async verifyAccount(accountNumber: string, bankCode: string) {
    return this.paystackService.verifyAccountNumber(accountNumber, bankCode);
  }

  /**
   * Set withdrawal account for staff
   */
  async setWithdrawalAccount(userId: string, bankDetails: any) {
    this.logger.log(`Setting withdrawal account for staff user ${userId}`);

    const userObjectId = new Types.ObjectId(userId);

    // Map DTO fields to wallet service expected format
    const walletBankDetails = {
      bank_name: bankDetails.bankName,
      bank_code: bankDetails.bankCode,
      account_number: bankDetails.accountNumber,
      account_name: bankDetails.accountName,
      bvn: bankDetails.bvn,
    };

    const updatedWallet = await this.walletService.setWithdrawalAccount(
      userObjectId as any,
      walletBankDetails,
    );

    return {
      message: 'Withdrawal account set successfully',
      wallet: {
        bankName: updatedWallet.bank_name,
        bankCode: updatedWallet.bank_code,
        accountNumber: updatedWallet.account_number,
        accountName: updatedWallet.account_name,
      },
    };
  }

  /**
   * Withdraw from staff wallet
   */
  async withdrawFromWallet(userId: string, withdrawDto: any) {
    this.logger.log(
      `Processing withdrawal for staff user ${userId}: ₦${withdrawDto.amount}`,
    );

    // Verify PIN
    const user = await this.staffRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    const isPinValid = await comparePin(withdrawDto.pin, user.password);
    if (!isPinValid) {
      throw new InvalidPinException();
    }

    const userObjectId = new Types.ObjectId(userId);
    const amountInKobo = withdrawDto.amount * 100;

    let bankDetails;
    if (withdrawDto.bankName && withdrawDto.accountNumber) {
      bankDetails = {
        bank_name: withdrawDto.bankName,
        bank_code: withdrawDto.bankCode,
        account_number: withdrawDto.accountNumber,
        account_name: withdrawDto.accountName,
      };
    }

    const updatedWallet = await this.walletService.withdrawFromWallet(
      userObjectId as any,
      amountInKobo,
      bankDetails,
    );

    // Send SMS notification
    const accountInfo = bankDetails
      ? `${bankDetails.account_name} (${bankDetails.account_number})`
      : `${updatedWallet.account_name} (${updatedWallet.account_number})`;

    const smsMessage = `Your withdrawal of ₦${withdrawDto.amount.toLocaleString()} to ${accountInfo} has been processed successfully. New balance: ₦${(updatedWallet.balance / 100).toLocaleString()}.`;

    try {
      await this.smsService.sendSms({
        to: user.phone,
        message: smsMessage,
        messageType: 'withdrawal_processed',
      });
      this.logger.log(`Withdrawal SMS sent to ${user.phone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal SMS: ${(error as Error).message}`,
      );
    }

    return {
      message: 'Withdrawal processed successfully',
      wallet: {
        balance: updatedWallet.balance / 100, // Convert back to naira
        totalWithdrawn: updatedWallet.total_withdrawn / 100,
      },
    };
  }

  /**
   * Request PIN reset - send OTP via SMS
   */
  async requestPinReset(
    requestDto: RequestPinResetDto,
  ): Promise<{ message: string }> {
    this.logger.log(`PIN reset requested for: ${requestDto.phone}`);

    const { phone: normalizedPhone } = normalizePhoneNumber(requestDto.phone);

    // Check if staff exists
    const user = await this.staffRepository.findUserByPhone(normalizedPhone);
    if (!user || user.user_type !== 'staff') {
      // Don't reveal if phone exists or not for security
      return {
        message:
          'If this phone number is registered, you will receive an OTP shortly.',
      };
    }

    // Get staff profile
    const staff = await this.staffRepository.findStaffByUserId(
      user._id.toString(),
    );
    if (!staff || !staff.is_active || !staff.is_approved) {
      return {
        message:
          'If this phone number is registered, you will receive an OTP shortly.',
      };
    }

    // Check if there's already an active OTP
    if (this.otpService.hasActiveOtp(normalizedPhone)) {
      throw new BadRequestException(
        'An OTP has already been sent. Please wait before requesting a new one.',
      );
    }

    // Generate OTP
    const otp = this.otpService.generateOtp(normalizedPhone);

    // Send SMS with OTP
    const message = `Your FarmConnect staff PIN reset code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;

    try {
      await this.smsService.sendSms({
        to: normalizedPhone,
        message,
        messageType: 'registration', // Using existing message type
      });

      this.logger.log(`PIN reset OTP sent to ${normalizedPhone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send PIN reset SMS: ${(error as Error).message}`,
      );
      // Clear OTP if SMS failed
      this.otpService.clearOtp(normalizedPhone);
      throw new BadRequestException(
        'Failed to send OTP. Please try again later.',
      );
    }

    return { message: 'OTP sent successfully to your phone number.' };
  }

  /**
   * Verify OTP and reset PIN
   */
  async verifyPinReset(
    verifyDto: VerifyPinResetDto,
  ): Promise<{ message: string }> {
    this.logger.log(`PIN reset verification for: ${verifyDto.phone}`);

    const { phone: normalizedPhone } = normalizePhoneNumber(verifyDto.phone);

    // Find staff user
    const user = await this.staffRepository.findUserByPhone(normalizedPhone);
    if (!user || user.user_type !== 'staff') {
      throw new BadRequestException('Invalid phone number or OTP.');
    }

    // Get staff profile
    const staff = await this.staffRepository.findStaffByUserId(
      user._id.toString(),
    );
    if (!staff || !staff.is_active || !staff.is_approved) {
      throw new BadRequestException('Account is not active or approved.');
    }

    // Verify OTP
    const isOtpValid = this.otpService.verifyOtp(
      normalizedPhone,
      verifyDto.otp,
    );
    if (!isOtpValid) {
      const remainingAttempts =
        this.otpService.getRemainingAttempts(normalizedPhone);
      if (remainingAttempts > 0) {
        throw new BadRequestException(
          `Invalid OTP. ${remainingAttempts} attempts remaining.`,
        );
      } else {
        throw new BadRequestException(
          'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
        );
      }
    }

    // Validate new PIN
    if (!isValidPin(verifyDto.newPin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // Hash the new PIN
    const hashedPin = await hashPin(verifyDto.newPin);

    // Update user password
    await this.staffRepository.updateUser(user._id.toString(), {
      password: hashedPin,
    } as any);

    this.logger.log(`PIN reset successful for: ${normalizedPhone}`);

    // Send confirmation SMS
    try {
      await this.smsService.sendSms({
        to: normalizedPhone,
        message:
          'Your FarmConnect staff PIN has been reset successfully. If you did not request this, please contact support immediately.',
        messageType: 'registration',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send PIN reset confirmation SMS: ${(error as Error).message}`,
      );
      // Don't throw error as PIN reset was successful
    }

    return { message: 'PIN reset successfully.' };
  }
}
