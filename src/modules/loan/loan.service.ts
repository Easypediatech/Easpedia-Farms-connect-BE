// src/modules/loan/loan.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoanRepository } from './loan.repository';
import { LoanTypeRepository } from './loan-type.repository';
import { CreateLoanTypeDto } from './dto/create-loan-type.dto';
import {
  CreateLoanDto,
  UpdateLoanStatusDto,
  RecordLoanPaymentDto,
  ApproveLoanRequestDto,
  CreateLoanRequestDto,
} from './dto/create-loan.dto';
import { GetAllLoansDto } from './dto/get-all-loans.dto';
import {
  LoanTypeResponseDto,
  LoanResponseDto,
  LoanKPIsDto,
} from './dto/loan-response.dto';
import { plainToInstance } from 'class-transformer';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Loan } from '../../schemas/loan.schema';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly loanTypeRepository: LoanTypeRepository,
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
    @InjectModel(Staff.name)
    private readonly staffModel: Model<StaffDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new loan type
   */
  async createLoanType(
    createDto: CreateLoanTypeDto,
  ): Promise<LoanTypeResponseDto> {
    this.logger.log(`Creating loan type: ${createDto.name}`);

    // Check if loan type with same name exists
    const existing = await this.loanTypeRepository.findByName(createDto.name);
    if (existing) {
      throw new ConflictException(
        `Loan type with name "${createDto.name}" already exists`,
      );
    }

    const loanType = await this.loanTypeRepository.create(createDto);
    return this.transformToLoanTypeResponseDto(loanType);
  }

  /**
   * Get all loan types
   */
  async getAllLoanTypes(filters: {
    category?: string;
    is_active?: boolean;
    user_type?: string;
  }): Promise<LoanTypeResponseDto[]> {
    this.logger.log('Fetching all loan types');
    const loanTypes = await this.loanTypeRepository.findAll(filters);
    return loanTypes.map((lt) => this.transformToLoanTypeResponseDto(lt));
  }

  /**
   * Get loan type by ID
   */
  async getLoanTypeById(id: string): Promise<LoanTypeResponseDto> {
    const loanType = await this.loanTypeRepository.findById(id);
    if (!loanType) {
      throw new NotFoundException(`Loan type with ID ${id} not found`);
    }
    return this.transformToLoanTypeResponseDto(loanType);
  }

  /**
   * Update loan type
   */
  async updateLoanType(
    id: string,
    updateDto: Partial<CreateLoanTypeDto>,
  ): Promise<LoanTypeResponseDto> {
    this.logger.log(`Updating loan type: ${id}`);

    const loanType = await this.loanTypeRepository.findById(id);
    if (!loanType) {
      throw new NotFoundException(`Loan type with ID ${id} not found`);
    }

    const updated = await this.loanTypeRepository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Loan type with ID ${id} not found`);
    }

    return this.transformToLoanTypeResponseDto(updated);
  }

  /**
   * Toggle loan type active status
   */
  async toggleLoanTypeActive(id: string): Promise<LoanTypeResponseDto> {
    const updated = await this.loanTypeRepository.toggleActive(id);
    if (!updated) {
      throw new NotFoundException(`Loan type with ID ${id} not found`);
    }
    return this.transformToLoanTypeResponseDto(updated);
  }

  /**
   * Delete loan type
   */
  async deleteLoanType(id: string): Promise<{ message: string }> {
    const loanType = await this.loanTypeRepository.findById(id);
    if (!loanType) {
      throw new NotFoundException(`Loan type with ID ${id} not found`);
    }

    // Check if any active loans are using this loan type
    // This would require checking if loans exist with this loan_type_id
    // For now, we'll allow deletion

    await this.loanTypeRepository.delete(id);
    return { message: `Loan type "${loanType.name}" deleted successfully` };
  }

  /**
   * Create a new loan for a farmer
   */
  async createLoan(createDto: CreateLoanDto): Promise<LoanResponseDto> {
    this.logger.log(`Creating loan for farmer: ${createDto.farmer_id}`);

    // Validate farmer exists
    const farmer = await this.farmerModel.findById(createDto.farmer_id).exec();
    if (!farmer) {
      throw new NotFoundException(
        `Farmer with ID ${createDto.farmer_id} not found`,
      );
    }

    // Get user info for farmer
    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(
        `User for farmer ${createDto.farmer_id} not found`,
      );
    }

    // Check if farmer has active loans
    const hasActiveLoan = await this.loanRepository.hasActiveLoan(
      createDto.farmer_id,
    );
    if (hasActiveLoan) {
      throw new BadRequestException(
        'Farmer already has an active loan. Please repay existing loan first.',
      );
    }

    // Get loan type
    const loanType = await this.loanTypeRepository.findById(
      createDto.loan_type_id,
    );
    if (!loanType) {
      throw new NotFoundException(
        `Loan type with ID ${createDto.loan_type_id} not found`,
      );
    }

    if (!loanType.is_active) {
      throw new BadRequestException(
        `Loan type "${loanType.name}" is not currently available`,
      );
    }

    // Check basic eligibility: no active loans and good credit history
    if (farmer.active_loan) {
      throw new BadRequestException(
        'Farmer already has an active loan. Please repay existing loan first.',
      );
    }

    if (farmer.loan_defaults > 0) {
      throw new BadRequestException(
        `Farmer has ${farmer.loan_defaults} loan defaults. Please clear defaults first.`,
      );
    }

    // Generate unique reference
    const reference = await this.loanRepository.generateReference();

    // Validate items total matches principal amount
    const itemsTotal = createDto.items.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    if (itemsTotal !== createDto.principal_amount) {
      throw new BadRequestException(
        `Items total (₦${itemsTotal / 100}) does not match principal amount (₦${createDto.principal_amount / 100})`,
      );
    }

    // Create loan
    const loanData = {
      farmer_id: new Types.ObjectId(createDto.farmer_id) as any,
      loan_type_id: new Types.ObjectId(createDto.loan_type_id) as any,
      loan_type_name: loanType.name,
      farmer_name: `${farmer.first_name} ${farmer.last_name}`,
      farmer_phone: user.phone,
      principal_amount: createDto.principal_amount,
      interest_rate: loanType.interest_rate,
      duration_months: loanType.duration_months,
      items: createDto.items,
      purpose: createDto.purpose || loanType.description,
      reference,
      due_date: new Date(createDto.due_date),
      ...(createDto.monthly_payment && {
        monthly_payment: createDto.monthly_payment,
      }),
    };

    const loan = await this.loanRepository.create(loanData);

    // Update farmer's active_loan status
    farmer.active_loan = true;
    await farmer.save();

    // Increment loan type times_issued
    await this.loanTypeRepository.incrementTimesIssued(createDto.loan_type_id);

    this.logger.log(`Loan created successfully: ${reference}`);
    return this.transformToLoanResponseDto(loan);
  }

  /**
   * Create a staff personal loan (staff requests loan for themselves)
   *
   * payload should contain:
   * - staff_id (ObjectId or string)
   * - user_id (ObjectId or string)
   * - loan_type_id
   * - principal_amount (optional if items provided)
   * - items (optional)
   * - interest_rate (optional - will use loanType's interest_rate if omitted)
   * - duration_months (optional - will use loanType's duration_months if omitted)
   * - purpose, pickup_date, pickup_location, etc.
   */
  async createStaffLoan(payload: any): Promise<LoanResponseDto> {
    this.logger.log(
      `Creating staff loan for staff/user: ${payload.staff_id || payload.user_id}`,
    );

    // Validate user exists (use user_id if provided)
    if (!payload.user_id) {
      throw new BadRequestException('user_id is required for staff loans');
    }

    const userId = String(payload.user_id);
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Optionally: ensure user is staff (if you store user_type)
    // if (user.user_type !== 'staff') {
    //   throw new BadRequestException('User is not a staff member');
    // }

    // Resolve loan type
    const loanType = await this.loanTypeRepository.findById(
      payload.loan_type_id,
    );
    if (!loanType) {
      throw new NotFoundException(
        `Loan type with ID ${payload.loan_type_id} not found`,
      );
    }

    if (!loanType.is_active) {
      throw new BadRequestException(
        `Loan type "${loanType.name}" is not currently available`,
      );
    }

    // Validate that staff is not requesting a farmer loan
    if (loanType.user_type === 'farmer') {
      throw new BadRequestException(
        `Loan type "${loanType.name}" is only available for farmers. Staff members cannot request this loan type.`,
      );
    }

    // Check if staff/user has active loans (try generic check)
    // (Assumes loanRepository.hasActiveLoan can accept staff/user id - adapt if needed)
    const checkId = payload.staff_id || payload.user_id;
    let hasActive = false;
    try {
      hasActive = await this.loanRepository.hasActiveLoan(checkId);
    } catch (err) {
      // if repository doesn't support generic check, ignore and proceed
      this.logger.debug(
        `hasActiveLoan check failed for staff/user ${checkId}: ${err?.message ?? err}`,
      );
      hasActive = false;
    }

    if (hasActive) {
      throw new BadRequestException(
        'You already have an active loan. Please repay existing loan first.',
      );
    }

    // Validate principal / items
    let principal = payload.principal_amount || 0;
    const items: any[] = payload.items || [];

    if (items.length > 0) {
      const itemsTotal = items.reduce((s, it) => s + (it.total_price || 0), 0);
      if (principal === 0) {
        principal = itemsTotal;
      } else if (itemsTotal !== principal) {
        throw new BadRequestException(
          `Items total (₦${itemsTotal / 100}) does not match principal amount (₦${principal / 100})`,
        );
      }
    }

    if (!principal || principal <= 0) {
      throw new BadRequestException(
        'Principal amount must be provided and greater than zero',
      );
    }

    // Use loanType defaults if missing
    const interestRate =
      typeof payload.interest_rate === 'number'
        ? payload.interest_rate
        : loanType.interest_rate;
    const durationMonths =
      payload.duration_months || loanType.duration_months || 3;

    // Generate unique reference
    const reference = await this.loanRepository.generateReference();

    // Calculate interest and repayment
    const interest_amount = Math.round((principal * interestRate) / 100);
    const total_repayment = principal + interest_amount;
    const monthly_payment = Math.round(total_repayment / durationMonths);
    const amount_outstanding = total_repayment;

    // Calculate due date from now + durationMonths
    const dueDate = payload.due_date
      ? new Date(payload.due_date)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + Number(durationMonths));
          return d;
        })();

    // Get staff information for populating staff_name and staff_phone
    let staff_name = '';
    let staff_phone = user.phone || '';

    if (payload.staff_id) {
      try {
        // Import Staff model or use repository to get staff name
        const staff = await this.staffModel.findById(payload.staff_id).exec();
        if (staff) {
          staff_name = `${staff.first_name} ${staff.last_name}`;
        }
      } catch (err) {
        this.logger.debug(
          `Failed to fetch staff details: ${err?.message ?? err}`,
        );
      }
    }

    // Build loan document
    const loanData: any = {
      staff_id: payload.staff_id
        ? new Types.ObjectId(payload.staff_id)
        : undefined,
      user_id: new Types.ObjectId(payload.user_id),
      loan_type_id: new Types.ObjectId(payload.loan_type_id),
      loan_type_name: loanType.name,
      staff_name,
      staff_phone,
      principal_amount: principal,
      interest_rate: interestRate,
      interest_amount,
      total_repayment,
      duration_months: Number(durationMonths),
      monthly_payment,
      amount_paid: 0,
      amount_outstanding,
      items,
      purpose: payload.purpose || loanType.description || 'Staff personal loan',
      reference,
      pickup_date: payload.pickup_date
        ? new Date(payload.pickup_date)
        : undefined,
      pickup_location: payload.pickup_location,
      status: payload.status || 'requested',
      due_date: dueDate,
    };

    // Persist loan
    const loan = await this.loanRepository.create(loanData);

    // Optionally: increment loan type times issued
    try {
      await this.loanTypeRepository.incrementTimesIssued(payload.loan_type_id);
    } catch (err) {
      this.logger.debug(
        `Failed to increment timesIssued for loanType: ${err?.message ?? err}`,
      );
    }

    this.logger.log(`Staff loan created successfully: ${reference}`);
    return this.transformToLoanResponseDto(loan);
  }

  /**
   * Get all loans with filters and pagination
   */
  async getAllLoans(filters: GetAllLoansDto): Promise<{
    loans: LoanResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Fetching all loans with filters');

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...rest
    } = filters;

    const queryFilters: any = {
      ...rest,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    // Convert date strings to Date objects
    if (rest.due_before) {
      queryFilters.due_before = new Date(rest.due_before);
    }
    if (rest.created_after) {
      queryFilters.created_after = new Date(rest.created_after);
    }

    const { loans, total } = await this.loanRepository.findAll(queryFilters);

    return {
      loans: loans.map((loan) => this.transformToLoanResponseDto(loan)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get loan by ID
   */
  async getLoanById(id: string): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
    return this.transformToLoanResponseDto(loan);
  }

  /**
   * Update loan status
   */
  async updateLoanStatus(
    id: string,
    updateDto: UpdateLoanStatusDto,
  ): Promise<LoanResponseDto> {
    this.logger.log(`Updating loan status: ${id} to ${updateDto.status}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    // If marking as completed or defaulted, update farmer's active_loan status
    if (updateDto.status === 'completed' || updateDto.status === 'defaulted') {
      // only update farmer model if loan belongs to a farmer
      if (loan.farmer_id) {
        const farmer = await this.farmerModel.findById(loan.farmer_id).exec();
        if (farmer) {
          farmer.active_loan = false;

          // Increment loan defaults if defaulted
          if (updateDto.status === 'defaulted') {
            farmer.loan_defaults += 1;

            // Reduce credit score for default
            farmer.credit_score = Math.max(300, farmer.credit_score - 50);
          } else if (updateDto.status === 'completed') {
            // Increase credit score for successful repayment
            farmer.credit_score = Math.min(850, farmer.credit_score + 10);
          }

          await farmer.save();
        }
      }
    }

    // If amount_paid is provided, record the payment
    if (updateDto.amount_paid !== undefined) {
      const updated = await this.loanRepository.recordPayment(
        id,
        updateDto.amount_paid,
      );
      return this.transformToLoanResponseDto(updated!);
    }

    const updated = await this.loanRepository.updateStatus(
      id,
      updateDto.status,
    );
    if (!updated) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return this.transformToLoanResponseDto(updated);
  }

  /**
   * Record loan payment
   */
  async recordPayment(
    id: string,
    paymentDto: RecordLoanPaymentDto,
  ): Promise<LoanResponseDto> {
    this.logger.log(`Recording payment for loan: ${id}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    if (loan.status !== 'active') {
      throw new BadRequestException(
        `Cannot record payment for loan with status: ${loan.status}`,
      );
    }

    if (paymentDto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (paymentDto.amount > loan.amount_outstanding) {
      throw new BadRequestException(
        `Payment amount (₦${paymentDto.amount / 100}) exceeds outstanding amount (₦${loan.amount_outstanding / 100})`,
      );
    }

    const updated = await this.loanRepository.recordPayment(
      id,
      paymentDto.amount,
    );

    // If loan is now completed, update farmer status
    if (updated!.status === 'completed') {
      if (loan.farmer_id) {
        const farmer = await this.farmerModel.findById(loan.farmer_id).exec();
        if (farmer) {
          farmer.active_loan = false;
          farmer.credit_score = Math.min(850, farmer.credit_score + 10);
          await farmer.save();
        }
      }
    }

    return this.transformToLoanResponseDto(updated!);
  }

  /**
   * Get loan KPIs/statistics
   */
  async getLoanKPIs(): Promise<LoanKPIsDto> {
    this.logger.log('Fetching loan KPIs');

    const stats = await this.loanRepository.getStatistics();

    const totalLoans =
      stats.total_active + stats.total_completed + stats.total_defaulted;
    const defaultRate =
      totalLoans > 0 ? (stats.total_defaulted / totalLoans) * 100 : 0;
    const averageLoanSize =
      totalLoans > 0 ? stats.total_disbursed / totalLoans : 0;

    const interestEarned = stats.total_repaid - stats.total_disbursed;

    return plainToInstance(
      LoanKPIsDto,
      {
        total_active_loans: stats.total_active,
        total_completed_loans: stats.total_completed,
        total_defaulted_loans: stats.total_defaulted,
        total_outstanding_amount: stats.total_outstanding,
        total_principal_disbursed: stats.total_disbursed,
        total_amount_repaid: stats.total_repaid,
        total_interest_earned: Math.max(0, interestEarned),
        average_loan_size: Math.round(averageLoanSize),
        default_rate: Math.round(defaultRate * 100) / 100,
        loans_due_in_30_days: stats.loans_due_30_days,
        overdue_loans: stats.overdue_loans,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Create a loan request from USSD (farmer initiated)
   */
  async createLoanRequest(
    farmerId: string,
    createDto: CreateLoanRequestDto,
  ): Promise<LoanResponseDto> {
    this.logger.log(
      `Creating loan request for farmer: ${farmerId}, loan type: ${createDto.loan_type_id}`,
    );

    // Validate farmer exists
    const farmer = await this.farmerModel.findById(farmerId).exec();
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
    }

    // Get user info for farmer
    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      throw new NotFoundException(`User for farmer ${farmerId} not found`);
    }

    // Check if farmer has active loans
    const hasActiveLoan = await this.loanRepository.hasActiveLoan(farmerId);
    if (hasActiveLoan) {
      throw new BadRequestException(
        'You already have an active loan. Please repay existing loan first.',
      );
    }

    // Get loan type
    const loanType = await this.loanTypeRepository.findById(
      createDto.loan_type_id,
    );
    if (!loanType) {
      throw new NotFoundException(
        `Loan type with ID ${createDto.loan_type_id} not found`,
      );
    }

    if (!loanType.is_active) {
      throw new BadRequestException(
        `Loan type "${loanType.name}" is not currently available`,
      );
    }

    // Check farmer eligibility
    if (farmer.loan_defaults > 0) {
      throw new BadRequestException(
        `You have ${farmer.loan_defaults} loan defaults. Please contact support.`,
      );
    }

    // Generate unique reference
    const reference = await this.loanRepository.generateReference();

    // For loan requests from USSD, we use the loan type's default values
    // Items will be specified by admin when approving
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + loanType.duration_months);

    // Create loan request with 'requested' status
    const loanData = {
      farmer_id: new Types.ObjectId(farmerId) as any,
      loan_type_id: new Types.ObjectId(createDto.loan_type_id) as any,
      loan_type_name: loanType.name,
      farmer_name: `${farmer.first_name} ${farmer.last_name}`,
      farmer_phone: user.phone,
      principal_amount: 0, // Will be set when admin approves and specifies items
      interest_rate: loanType.interest_rate,
      duration_months: loanType.duration_months,
      items: [], // Will be filled by admin
      purpose: createDto.purpose || loanType.description,
      reference,
      due_date: dueDate,
      status: 'requested',
    };

    const loan = await this.loanRepository.create(loanData);

    this.logger.log(`Loan request created successfully: ${reference}`);
    return this.transformToLoanResponseDto(loan);
  }

  /**
   * Get all loan requests (status = requested)
   */
  async getRequestedLoans(): Promise<LoanResponseDto[]> {
    this.logger.log('Fetching all loan requests');

    const filters = {
      status: 'requested',
      page: 1,
      limit: 1000,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    const { loans } = await this.loanRepository.findAll(filters);
    return loans.map((loan) => this.transformToLoanResponseDto(loan));
  }

  /**
   * Approve a loan request
   */
  async approveLoanRequest(
    id: string,
    approveDto: ApproveLoanRequestDto,
  ): Promise<LoanResponseDto> {
    this.logger.log(`Approving loan request: ${id}`);

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    if (loan.status !== 'requested') {
      throw new BadRequestException(
        `Cannot approve loan with status: ${loan.status}`,
      );
    }

    // Update loan with pickup date and approved status
    const pickupDate = new Date(approveDto.pickup_date);
    loan.pickup_date = pickupDate;
    loan.status = 'approved';
    loan.approved_at = new Date();

    await loan.save();

    this.logger.log(
      `Loan request approved: ${loan.reference}, pickup date: ${pickupDate}`,
    );

    return this.transformToLoanResponseDto(loan);
  }

  /**
   * Transform loan type to response DTO
   */
  private transformToLoanTypeResponseDto(loanType: any): LoanTypeResponseDto {
    return plainToInstance(
      LoanTypeResponseDto,
      {
        ...loanType.toObject(),
        id: String(loanType._id),
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Transform loan to response DTO
   */
  private transformToLoanResponseDto(loan: any): LoanResponseDto {
    const loanObj = loan.toObject ? loan.toObject() : loan;

    // Extract IDs properly - handle populated and non-populated
    const farmerId = loanObj.farmer_id?._id
      ? String(loanObj.farmer_id._id)
      : loanObj.farmer_id
        ? String(loanObj.farmer_id)
        : undefined;

    const staffId = loanObj.staff_id?._id
      ? String(loanObj.staff_id._id)
      : loanObj.staff_id
        ? String(loanObj.staff_id)
        : undefined;

    const userId = loanObj.user_id?._id
      ? String(loanObj.user_id._id)
      : loanObj.user_id
        ? String(loanObj.user_id)
        : undefined;

    const loanTypeId = loanObj.loan_type_id?._id
      ? String(loanObj.loan_type_id._id)
      : String(loanObj.loan_type_id);

    return plainToInstance(
      LoanResponseDto,
      {
        ...loanObj,
        id: String(loanObj._id),
        farmer_id: farmerId,
        staff_id: staffId,
        user_id: userId,
        loan_type_id: loanTypeId,
      },
      { excludeExtraneousValues: true },
    );
  }
}
