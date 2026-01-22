import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan, LoanDocument } from '../../schemas/loan.schema';

@Injectable()
export class LoanRepository {
  private readonly logger = new Logger(LoanRepository.name);

  constructor(
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
  ) {}

  /**
   * Create a new loan
   */
  async create(loanData: Partial<Loan>): Promise<LoanDocument> {
    this.logger.log(`Creating loan for farmer: ${loanData.farmer_id}`);
    const loan = new this.loanModel(loanData);
    return loan.save();
  }

  /**
   * Find loan by ID
   */
  async findById(id: string): Promise<LoanDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.loanModel
      .findById(id)
      .populate('farmer_id')
      .populate('loan_type_id')
      .exec();
  }

  /**
   * Find loan by reference
   */
  async findByReference(reference: string): Promise<LoanDocument | null> {
    return this.loanModel
      .findOne({ reference })
      .populate('farmer_id')
      .populate('loan_type_id')
      .exec();
  }

  /**
   * Find all loans for a farmer
   */
  async findByFarmerId(
    farmerId: string | Types.ObjectId,
  ): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ farmer_id: farmerId })
      .populate('loan_type_id')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find active loans for a farmer
   */
  async findActiveLoansByFarmerId(
    farmerId: string | Types.ObjectId,
  ): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ farmer_id: farmerId, status: 'active' })
      .populate('loan_type_id')
      .exec();
  }

  /**
   * Find all loans with filters and pagination
   */
  async findAll(filters: {
    status?: string;
    category?: string;
    farmer_id?: string;
    staff_id?: string;
    user_id?: string;
    due_before?: Date;
    created_after?: Date;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<{ loans: LoanDocument[]; total: number }> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.farmer_id && Types.ObjectId.isValid(filters.farmer_id)) {
      query.farmer_id = new Types.ObjectId(filters.farmer_id);
    }

    if (filters.staff_id && Types.ObjectId.isValid(filters.staff_id)) {
      query.staff_id = new Types.ObjectId(filters.staff_id);
    }

    if (filters.user_id && Types.ObjectId.isValid(filters.user_id)) {
      query.user_id = new Types.ObjectId(filters.user_id);
    }

    if (filters.due_before) {
      query.due_date = { $lte: filters.due_before };
    }

    if (filters.created_after) {
      query.createdAt = { $gte: filters.created_after };
    }

    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sortField = filters.sortBy || 'createdAt';

    const [loans, total] = await Promise.all([
      this.loanModel
        .find(query)
        .populate('farmer_id')
        .populate('loan_type_id')
        .sort({ [sortField]: sortOrder })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .exec(),
      this.loanModel.countDocuments(query).exec(),
    ]);

    return { loans, total };
  }

  /**
   * Update loan
   */
  async update(
    id: string,
    updateData: Partial<Loan>,
  ): Promise<LoanDocument | null> {
    return this.loanModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('farmer_id')
      .populate('loan_type_id')
      .exec();
  }

  /**
   * Record payment for a loan
   */
  async recordPayment(
    id: string,
    amount: number,
  ): Promise<LoanDocument | null> {
    const loan = await this.findById(id);
    if (!loan) {
      return null;
    }

    loan.amount_paid += amount;
    loan.last_payment_date = new Date();

    // The pre-save hook will handle updating amount_outstanding and status
    return loan.save();
  }

  /**
   * Update loan status
   */
  async updateStatus(id: string, status: string): Promise<LoanDocument | null> {
    const updateData: any = { status };

    if (status === 'completed') {
      updateData.completed_at = new Date();
    } else if (status === 'defaulted') {
      updateData.defaulted_at = new Date();
    }

    return this.loanModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('farmer_id')
      .populate('loan_type_id')
      .exec();
  }

  /**
   * Get loan statistics
   */
  async getStatistics(): Promise<{
    total_active: number;
    total_completed: number;
    total_defaulted: number;
    total_outstanding: number;
    total_disbursed: number;
    total_repaid: number;
    loans_due_30_days: number;
    overdue_loans: number;
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      activeLoans,
      completedLoans,
      defaultedLoans,
      outstandingAgg,
      disbursedAgg,
      repaidAgg,
      loansDue30Days,
      overdueLoans,
    ] = await Promise.all([
      this.loanModel.countDocuments({ status: 'active' }).exec(),
      this.loanModel.countDocuments({ status: 'completed' }).exec(),
      this.loanModel.countDocuments({ status: 'defaulted' }).exec(),
      this.loanModel.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount_outstanding' } } },
      ]),
      this.loanModel.aggregate([
        { $group: { _id: null, total: { $sum: '$principal_amount' } } },
      ]),
      this.loanModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount_paid' } } },
      ]),
      this.loanModel
        .countDocuments({
          status: 'active',
          due_date: { $lte: thirtyDaysFromNow, $gte: now },
        })
        .exec(),
      this.loanModel
        .countDocuments({ status: 'active', due_date: { $lt: now } })
        .exec(),
    ]);

    return {
      total_active: activeLoans,
      total_completed: completedLoans,
      total_defaulted: defaultedLoans,
      total_outstanding: outstandingAgg[0]?.total || 0,
      total_disbursed: disbursedAgg[0]?.total || 0,
      total_repaid: repaidAgg[0]?.total || 0,
      loans_due_30_days: loansDue30Days,
      overdue_loans: overdueLoans,
    };
  }

  /**
   * Generate unique loan reference
   */
  async generateReference(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of loans created today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const count = await this.loanModel
      .countDocuments({
        createdAt: { $gte: startOfDay },
      })
      .exec();

    const sequence = (count + 1).toString().padStart(3, '0');
    return `LOAN${dateStr}${sequence}`;
  }

  /**
   * Check if farmer has active loans
   */
  async hasActiveLoan(farmerId: string | Types.ObjectId): Promise<boolean> {
    const count = await this.loanModel
      .countDocuments({ farmer_id: farmerId, status: 'active' })
      .exec();
    return count > 0;
  }

  /**
   * Get farmer's loan count by status
   */
  async getFarmerLoanCount(
    farmerId: string | Types.ObjectId,
    status?: string,
  ): Promise<number> {
    const query: any = { farmer_id: farmerId };
    if (status) {
      query.status = status;
    }
    return this.loanModel.countDocuments(query).exec();
  }

  /**
   * Find loan requests (both pending and recently approved)
   */
  async findLoanRequests(filters: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ loans: LoanDocument[]; total: number }> {
    // Show both requested and recently approved loans (approved in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query: any = {
      $or: [
        { status: 'requested' },
        {
          status: 'approved',
          approved_at: { $gte: thirtyDaysAgo },
        },
      ],
    };

    // Add search filter if provided
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { farmer_name: { $regex: filters.search, $options: 'i' } },
          { staff_name: { $regex: filters.search, $options: 'i' } },
          { reference: { $regex: filters.search, $options: 'i' } },
          { farmer_phone: { $regex: filters.search, $options: 'i' } },
          { staff_phone: { $regex: filters.search, $options: 'i' } },
        ],
      });
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sortObj: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

    const [loans, total] = await Promise.all([
      this.loanModel
        .find(query)
        .populate('farmer_id', 'first_name last_name')
        .populate({
          path: 'staff_id',
          populate: {
            path: 'user_id',
            select: 'phone',
          },
        })
        .populate('loan_type_id', 'name category')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.loanModel.countDocuments(query).exec(),
    ]);

    return { loans, total };
  }
}
