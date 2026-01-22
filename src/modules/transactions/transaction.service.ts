import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  Transaction,
  Wallet,
  Loan,
  Purchase,
  User,
  UserDocument,
} from '../../schemas';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { FarmerRepository } from '../farmer/farmer.repository';
import { BuyerRepository } from '../buyer/buyer.repository';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(Loan.name) private loanModel: Model<Loan>,
    @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly farmerRepository: FarmerRepository,
    private readonly buyerRepository: BuyerRepository,
  ) {}

  async getAllTransactions(query: GetTransactionsQueryDto): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      userType,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    // Apply filters
    if (type && type !== 'all') {
      filter.type = type;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (userType && userType !== 'all') {
      filter.user_type = userType;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    // Transform transactions with user details
    const transformedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const userDetails = transaction.user_id
          ? await this.getUserDetails(
              transaction.user_id.toString(),
              transaction.user_type,
            )
          : null;

        return this.transformTransactionResponse(transaction, userDetails);
      }),
    );

    return {
      transactions: transformedTransactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionsByType(
    type: 'wallet' | 'loan' | 'purchase',
    query: GetTransactionsQueryDto,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const typeFilters = {
      wallet: ['deposit', 'withdrawal'],
      loan: ['loan_disbursement', 'loan_repayment'],
      purchase: ['sale', 'purchase'],
    };

    // Get the allowed types for this category
    const allowedTypes = typeFilters[type];
    
    const {
      page = 1,
      limit = 20,
      status,
      userType,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    // Filter by transaction types for this category
    filter.type = { $in: allowedTypes };

    // Apply other filters
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (userType && userType !== 'all') {
      filter.user_type = userType;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    // Transform transactions with user details
    const transformedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const userDetails = await this.getUserDetails(
          String(transaction.user_id),
          transaction.user_type,
        );

        return this.transformTransactionResponse(transaction, userDetails);
      }),
    );

    return {
      transactions: transformedTransactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get organization wallet transactions
   */
  async getOrganizationTransactions(
    query: GetTransactionsQueryDto,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {
      user_type: 'organization',
    };

    // Apply other filters
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    // Transform transactions (no user details needed for organization)
    const transformedTransactions: TransactionResponseDto[] = transactions.map((transaction) => ({
      id: transaction._id.toString(),
      userId: transaction.user_id?.toString() || '',
      userType: transaction.user_type,
      type: transaction.type,
      amount: Number((transaction.amount / 100).toFixed(2)), // Convert from kobo to naira
      balanceBefore: Number((transaction.balance_before / 100).toFixed(2)),
      balanceAfter: Number((transaction.balance_after / 100).toFixed(2)),
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description || '',
      orderId: transaction.order_id?.toString(),
      loanId: transaction.loan_id?.toString(),
      user: {
        id: 'organization',
        name: 'Organization Wallet',
        phone: '',
        type: 'farmer' as const, // Using valid type from DTO
      },
      createdAt: (transaction as any).createdAt,
      completedAt: transaction.completed_at,
    }));

    return {
      transactions: transformedTransactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserTransactionsByUserId(
    userId: string,
    query: GetTransactionsQueryDto,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { user_id: userId };

    // Apply filters
    if (type && type !== 'all') {
      filter.type = type;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Sort configuration
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('getUserTransactionsByUserId filter:', filter);

    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    // Transform transactions with user details
    const transformedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const userDetails = transaction.user_id
          ? await this.getUserDetails(
              transaction.user_id.toString(),
              transaction.user_type,
            )
          : null;

        return this.transformTransactionResponse(transaction, userDetails);
      }),
    );

    return {
      transactions: transformedTransactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionStats(): Promise<{
    totalTransactions: number;
    totalAmount: number;
    pendingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    byType: {
      wallet: number;
      loan: number;
      purchase: number;
      organization: number;
    };
  }> {
    const [
      totalTransactions,
      totalAmountResult,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      walletTransactions,
      loanTransactions,
      purchaseTransactions,
      organizationTransactions,
    ] = await Promise.all([
      this.transactionModel.countDocuments(),
      this.transactionModel.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.transactionModel.countDocuments({ status: 'pending' }),
      this.transactionModel.countDocuments({ status: 'completed' }),
      this.transactionModel.countDocuments({ status: 'failed' }),
      this.transactionModel.countDocuments({
        type: { $in: ['deposit', 'withdrawal'] },
      }),
      this.transactionModel.countDocuments({
        type: { $in: ['loan_disbursement', 'loan_repayment'] },
      }),
      this.transactionModel.countDocuments({
        type: { $in: ['sale', 'purchase'] },
      }),
      this.transactionModel.countDocuments({
        user_type: 'organization',
      }),
    ]);

    const totalAmount = totalAmountResult[0]?.total || 0;

    return {
      totalTransactions,
      totalAmount: Number((totalAmount / 100).toFixed(2)), // Convert from kobo to naira
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      byType: {
        wallet: walletTransactions,
        loan: loanTransactions,
        purchase: purchaseTransactions,
        organization: organizationTransactions,
      },
    };
  }

  async getFarmerFinancialStatus(farmerId: string): Promise<{
    wallet: {
      balance: number;
      isActive: boolean;
    };
    outstandingLoans: Array<{
      id: string;
      principalAmount: number;
      totalRepayment: number;
      amountPaid: number;
      amountOutstanding: number;
      status: string;
    }>;
    recentPurchases: Array<{
      id: string;
      weightKg: number;
      totalAmount: number;
      netAmountCredited: number;
      status: string;
      createdAt: Date;
    }>;
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      status: string;
      description: string;
      createdAt: Date;
    }>;
  }> {
    try {
      // Get farmer details
      const farmer = await this.farmerRepository.findFarmerByUserId(farmerId);
      if (!farmer) {
        throw new Error('Farmer not found');
      }

      // Fetch wallet data
      const wallet = await this.walletModel
        .findOne({
          user_id: farmer.user_id,
          user_type: 'farmer',
        })
        .lean();

      const walletData = {
        balance: wallet ? wallet.balance : 0,
        isActive: !!wallet,
      };

      // Fetch loans
      const loans = await this.loanModel
        .find({
          farmer_id: farmer._id,
          status: { $in: ['active', 'approved'] },
          amount_outstanding: { $gt: 0 },
        })
        .lean();

      // Defensive mapping: ensure numeric fields are numbers (no undefined)
      const outstandingLoans = loans.map((loan: any) => {
        const principalAmount =
          typeof loan.principal_amount === 'number' ? loan.principal_amount : 0;

        const totalRepayment =
          typeof loan.total_repayment === 'number'
            ? loan.total_repayment
            : principalAmount; // fallback to principal if total not present

        const amountPaid =
          typeof loan.amount_paid === 'number' ? loan.amount_paid : 0;

        const amountOutstanding =
          typeof loan.amount_outstanding === 'number'
            ? loan.amount_outstanding
            : Math.max(totalRepayment - amountPaid, 0); // compute fallback

        return {
          id: String(loan._id),
          principalAmount,
          totalRepayment,
          amountPaid,
          amountOutstanding,
          status: loan.status || 'requested',
        };
      });

      // Fetch recent purchases (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const purchases = await this.purchaseModel
        .find({
          $or: [
            { farmerId: farmerId },
            { farmerId: farmer._id?.toString() },
            { farmerId: farmer.user_id?.toString() },
          ],
          createdAt: { $gte: thirtyDaysAgo },
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const recentPurchases = purchases.map((purchase: any) => ({
        id: purchase._id.toString(),
        weightKg: purchase.weightKg,
        totalAmount: purchase.totalAmount,
        netAmountCredited: purchase.netAmountCredited || purchase.totalAmount,
        status: purchase.status,
        createdAt: purchase.createdAt,
      }));

      // Fetch recent transactions (last 30 days)
      const recentTransactions = await this.transactionModel
        .find({
          user_id: farmer.user_id,
          createdAt: { $gte: thirtyDaysAgo },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const formattedTransactions = recentTransactions.map((transaction: any) => ({
        id: transaction._id.toString(),
        type: transaction.type,
        amount: Number((transaction.amount / 100).toFixed(2)),
        status: transaction.status,
        description: transaction.description || '',
        createdAt: transaction.createdAt || transaction.updatedAt || new Date(),
      }));

      return {
        wallet: walletData,
        outstandingLoans,
        recentPurchases,
        recentTransactions: formattedTransactions,
      };
    } catch (error: any) {
      console.error('Error fetching farmer financial status:', error?.message || error);
      throw new Error('Failed to fetch farmer financial status');
    }
  }

  private async getUserDetails(
    userId: string,
    userType: string,
  ): Promise<{
    id: string;
    name: string;
    phone: string;
    type: 'farmer' | 'buyer';
    lga?: string;
    farmSize?: number;
    businessName?: string;
  } | null> {
    try {
      if (userType === 'farmer') {
        const farmer = await this.farmerRepository.findFarmerByUserId(userId);
        if (farmer) {
          // Get user details for phone using the user_id from farmer
          const user = await this.userModel.findById(farmer.user_id).lean();
          return {
            id: String(farmer.user_id),
            name: `${farmer.first_name} ${farmer.last_name}`,
            phone: user?.phone || '',
            type: 'farmer',
            lga: farmer.lga,
            farmSize: farmer.farm_size_hectares,
          };
        }
      } else if (userType === 'buyer') {
        const buyer = await this.buyerRepository.findBuyerByUserId(userId);
        if (buyer) {
          // Get user details for phone
          const user = await this.userModel.findById(buyer.user_id).lean();
          return {
            id: buyer.user_id.toString(),
            name:
              buyer.business_name || `${buyer.first_name} ${buyer.last_name}`,
            phone: user?.phone || '',
            type: 'buyer',
            businessName: buyer.business_name,
          };
        }
      }
    } catch (error: any) {
      console.error(
        `Error fetching user details for ${userId}:`,
        error.message,
      );
    }

    return null;
  }

  private transformTransactionResponse(
    transaction: any,
    userDetails: any,
  ): TransactionResponseDto {
    return {
      id: transaction._id.toString(),
      userId: transaction.user_id?.toString() || '',
      userType: transaction.user_type,
      type: transaction.type,
      amount: Number((transaction.amount / 100).toFixed(2)), // Convert from kobo to naira
      balanceBefore: Number((transaction.balance_before / 100).toFixed(2)),
      balanceAfter: Number((transaction.balance_after / 100).toFixed(2)),
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      orderId: transaction.order_id?.toString(),
      loanId: transaction.loan_id?.toString(),
      user: userDetails,
      createdAt: transaction.createdAt,
      completedAt: transaction.completed_at,
    };
  }
}
