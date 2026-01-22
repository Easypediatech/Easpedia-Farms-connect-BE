/**
 * TransactionService Unit Tests
 *
 * Test Coverage:
 * - 18 comprehensive unit tests covering all service business logic
 * - Get all transactions functionality (3 tests)
 * - Get transactions by type functionality (3 tests)
 * - Get user transactions functionality (3 tests)
 * - Get transaction statistics functionality (2 tests)
 * - Get farmer financial status functionality (2 tests)
 * - User details retrieval functionality (3 tests)
 * - Transaction transformation functionality (2 tests)
 *
 * All tests validate proper business logic, error handling,
 * database interactions, and data transformation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { TransactionService } from './transaction.service';
import { FarmerRepository } from '../farmer/farmer.repository';
import { BuyerRepository } from '../buyer/buyer.repository';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { Transaction, TransactionDocument } from '../../schemas/transaction.schema';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';
import { Loan, LoanDocument } from '../../schemas/loan.schema';
import { Purchase } from '../../schemas/purchase.schema';
import { User, UserDocument } from '../../schemas/user.schema';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionModel: jest.Mocked<Model<TransactionDocument>>;
  let walletModel: jest.Mocked<Model<WalletDocument>>;
  let loanModel: jest.Mocked<Model<LoanDocument>>;
  let purchaseModel: jest.Mocked<Model<Purchase>>;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let farmerRepository: jest.Mocked<FarmerRepository>;
  let buyerRepository: jest.Mocked<BuyerRepository>;

  const mockUserId = new Types.ObjectId();
  const mockFarmerId = new Types.ObjectId();
  const mockTransactionId = new Types.ObjectId();

  const mockTransaction = {
    _id: mockTransactionId,
    user_id: mockUserId,
    user_type: 'farmer',
    type: 'sale',
    amount: 20000000, // 200,000 kobo
    balance_before: 10000000, // 100,000 kobo
    balance_after: 30000000, // 300,000 kobo
    status: 'completed',
    reference: 'TXN_202501010001',
    description: 'Sale of cassava - 100kg',
    order_id: new Types.ObjectId(),
    loan_id: new Types.ObjectId(),
    createdAt: new Date('2025-01-01'),
    completed_at: new Date('2025-01-01'),
  };

  const mockUser = {
    _id: mockUserId,
    phone: '08012345678',
    user_type: 'farmer',
    farmer_profile_id: mockFarmerId,
  };

  const mockFarmer = {
    _id: mockFarmerId,
    user_id: mockUserId,
    full_name: 'Ibrahim Yusuf',
    first_name: 'Ibrahim',
    last_name: 'Yusuf',
    lga: 'Kaduna North',
    farm_size_hectares: 5.5,
  };

  const mockBuyer = {
    _id: new Types.ObjectId(),
    user_id: mockUserId,
    full_name: 'Amina Ibrahim',
    first_name: 'Amina',
    last_name: 'Ibrahim',
    business_name: 'Amina Foods Processing Ltd',
  };

  const mockWallet = {
    _id: new Types.ObjectId(),
    user_id: mockUserId,
    balance: 15000000, // 150,000 kobo
    is_active: true,
  };

  const mockLoan = {
    _id: new Types.ObjectId(),
    farmer_id: mockFarmerId,
    principal_amount: 50000000,
    total_repayment_amount: 60000000,
    amount_paid: 30000000,
    amount_outstanding: 30000000,
    status: 'active',
  };

  // Mock implementations
  const mockTransactionModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockWalletModel = {
    findOne: jest.fn(),
  };

  const mockLoanModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockPurchaseModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  const mockFarmerRepository = {
    findFarmerByUserId: jest.fn(),
  };

  const mockBuyerRepository = {
    findBuyerByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
        {
          provide: getModelToken(Loan.name),
          useValue: mockLoanModel,
        },
        {
          provide: getModelToken(Purchase.name),
          useValue: mockPurchaseModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: FarmerRepository,
          useValue: mockFarmerRepository,
        },
        {
          provide: BuyerRepository,
          useValue: mockBuyerRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    transactionModel = module.get<Model<TransactionDocument>>(getModelToken(Transaction.name)) as jest.Mocked<Model<TransactionDocument>>;
    walletModel = module.get<Model<WalletDocument>>(getModelToken(Wallet.name)) as jest.Mocked<Model<WalletDocument>>;
    loanModel = module.get<Model<LoanDocument>>(getModelToken(Loan.name)) as jest.Mocked<Model<LoanDocument>>;
    purchaseModel = module.get<Model<Purchase>>(getModelToken(Purchase.name)) as jest.Mocked<Model<Purchase>>;
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name)) as jest.Mocked<Model<UserDocument>>;
    farmerRepository = module.get<FarmerRepository>(FarmerRepository) as jest.Mocked<FarmerRepository>;
    buyerRepository = module.get<BuyerRepository>(BuyerRepository) as jest.Mocked<BuyerRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTransactions', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 20,
      type: 'sale',
      status: 'completed',
      userType: 'farmer',
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser as any);
      farmerRepository.findFarmerByUserId.mockResolvedValue(mockFarmer as any);
    });

    it('should get all transactions with filtering and pagination', async () => {
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getAllTransactions(queryDto);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        type: 'sale',
        status: 'completed',
        user_type: 'farmer',
      });
      expect(mockTransactionModel.skip).toHaveBeenCalledWith(0);
      expect(mockTransactionModel.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        transactions: expect.arrayContaining([
          expect.objectContaining({
            id: mockTransactionId.toString(),
            type: 'sale',
            amount: 200000, // converted from kobo to naira
          }),
        ]),
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it('should handle date range filtering', async () => {
      const queryWithDates = {
        ...queryDto,
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
      };

      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      await service.getAllTransactions(queryWithDates);

      expect(mockTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2025-01-01T00:00:00.000Z'),
            $lte: new Date('2025-01-31T23:59:59.999Z'),
          },
        })
      );
    });

    it('should handle search filtering', async () => {
      const queryWithSearch = {
        ...queryDto,
        search: 'cassava',
      };

      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      await service.getAllTransactions(queryWithSearch);

      expect(mockTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { reference: { $regex: 'cassava', $options: 'i' } },
            { description: { $regex: 'cassava', $options: 'i' } },
          ],
        })
      );
    });
  });

  describe('getTransactionsByType', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 10,
      status: 'completed',
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser as any);
      farmerRepository.findFarmerByUserId.mockResolvedValue(mockFarmer as any);
    });

    it('should get wallet transactions', async () => {
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getTransactionsByType('wallet', queryDto);

      expect(mockTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: { $in: ['deposit', 'withdrawal'] },
          status: 'completed',
        })
      );
      expect(result.transactions).toHaveLength(1);
    });

    it('should get loan transactions', async () => {
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getTransactionsByType('loan', queryDto);

      expect(mockTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: { $in: ['loan_disbursement', 'loan_repayment'] },
        })
      );
    });

    it('should get purchase transactions', async () => {
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getTransactionsByType('purchase', queryDto);

      expect(mockTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: { $in: ['sale', 'purchase'] },
        })
      );
    });
  });

  describe('getUserTransactionsByUserId', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser as any);
      farmerRepository.findFarmerByUserId.mockResolvedValue(mockFarmer as any);
    });

    it('should get transactions for a specific user', async () => {
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getUserTransactionsByUserId(mockUserId.toString(), queryDto);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user_id: mockUserId.toString(),
      });
      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle filtering for user transactions', async () => {
      const queryWithFilters = {
        ...queryDto,
        type: 'sale',
        status: 'completed',
      };

      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
      mockTransactionModel.countDocuments.mockResolvedValue(1);

      await service.getUserTransactionsByUserId(mockUserId.toString(), queryWithFilters);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user_id: mockUserId.toString(),
        type: 'sale',
        status: 'completed',
      });
    });

    it('should handle empty results for user transactions', async () => {
      mockTransactionModel.exec.mockResolvedValue([]);
      mockTransactionModel.countDocuments.mockResolvedValue(0);

      const result = await service.getUserTransactionsByUserId(mockUserId.toString(), queryDto);

      expect(result).toEqual({
        transactions: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
    });
  });

  describe('getTransactionStats', () => {
    it('should return transaction statistics', async () => {
      const mockAggregateResult = [{ _id: null, total: 25000000000 }]; // 250,000,000 kobo
      
      mockTransactionModel.countDocuments
        .mockResolvedValueOnce(1500) // total
        .mockResolvedValueOnce(15) // pending
        .mockResolvedValueOnce(1450) // completed
        .mockResolvedValueOnce(35) // failed
        .mockResolvedValueOnce(800) // wallet
        .mockResolvedValueOnce(400) // loan
        .mockResolvedValueOnce(300); // purchase

      mockTransactionModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getTransactionStats();

      expect(result).toEqual({
        totalTransactions: 1500,
        totalAmount: 250000000, // amount in kobo, not converted
        pendingTransactions: 15,
        completedTransactions: 1450,
        failedTransactions: 35,
        byType: {
          wallet: 800,
          loan: 400,
          purchase: 300,
        },
      });
    });

    it('should handle empty aggregate result for total amount', async () => {
      mockTransactionModel.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockTransactionModel.aggregate.mockResolvedValue([]); // Empty result

      const result = await service.getTransactionStats();

      expect(result.totalAmount).toBe(0);
      expect(result.totalTransactions).toBe(0);
    });
  });

  describe('getFarmerFinancialStatus', () => {
    beforeEach(() => {
      walletModel.findOne.mockResolvedValue(mockWallet as any);
      loanModel.exec.mockResolvedValue([mockLoan]);
      purchaseModel.exec.mockResolvedValue([]);
      mockTransactionModel.exec.mockResolvedValue([mockTransaction]);
    });

    it('should get farmer financial status successfully', async () => {
      const result = await service.getFarmerFinancialStatus(mockFarmerId.toString());

      expect(walletModel.findOne).toHaveBeenCalledWith({
        user_id: mockFarmerId.toString(),
        user_type: 'farmer',
      });
      expect(loanModel.find).toHaveBeenCalledWith({
        farmer_id: mockFarmerId.toString(),
        status: { $in: ['approved', 'active'] },
      });
      expect(result).toHaveProperty('wallet');
      expect(result).toHaveProperty('outstandingLoans');
      expect(result).toHaveProperty('recentPurchases');
      expect(result).toHaveProperty('recentTransactions');
    });

    it('should handle farmer without wallet', async () => {
      walletModel.findOne.mockResolvedValue(null);

      const result = await service.getFarmerFinancialStatus(mockFarmerId.toString());

      expect(result.wallet).toEqual({
        balance: 0,
        isActive: false,
      });
    });
  });

  describe('getUserDetails', () => {
    it('should get farmer user details', async () => {
      userModel.findById.mockResolvedValue(mockUser as any);
      farmerRepository.findByUserId.mockResolvedValue(mockFarmer as any);

      // Access private method through service instance
      const result = await (service as any).getUserDetails(mockUserId.toString(), 'farmer');

      expect(userModel.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(farmerRepository.findFarmerByUserId).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual({
        id: mockUserId.toString(),
        name: 'Ibrahim Yusuf',
        phone: '08012345678',
        type: 'farmer',
        lga: 'Kaduna North',
        farmSize: 5.5,
      });
    });

    it('should get buyer user details', async () => {
      const buyerUser = { ...mockUser, user_type: 'buyer', buyer_profile_id: mockBuyer._id };
      userModel.findById.mockResolvedValue(buyerUser as any);
      buyerRepository.findBuyerByUserId.mockResolvedValue(mockBuyer as any);

      const result = await (service as any).getUserDetails(mockUserId.toString(), 'buyer');

      expect(buyerRepository.findBuyerByUserId).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual({
        id: mockUserId.toString(),
        name: 'Amina Ibrahim',
        phone: '08012345678',
        type: 'buyer',
        businessName: 'Amina Foods Processing Ltd',
      });
    });

    it('should return null when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      const result = await (service as any).getUserDetails('nonexistent', 'farmer');

      expect(result).toBeNull();
    });
  });

  describe('transformTransactionResponse', () => {
    it('should transform transaction with user details', async () => {
      const userDetails = {
        id: mockUserId.toString(),
        name: 'Ibrahim Yusuf',
        phone: '08012345678',
        type: 'farmer' as const,
        lga: 'Kaduna North',
        farmSize: 5.5,
      };

      const result = (service as any).transformTransactionResponse(mockTransaction, userDetails);

      expect(result).toEqual({
        id: mockTransactionId.toString(),
        userId: mockUserId.toString(),
        userType: 'farmer',
        type: 'sale',
        amount: 200000, // converted from kobo
        balanceBefore: 100000, // converted from kobo
        balanceAfter: 300000, // converted from kobo
        status: 'completed',
        reference: 'TXN_202501010001',
        description: 'Sale of cassava - 100kg',
        orderId: mockTransaction.order_id?.toString(),
        loanId: mockTransaction.loan_id?.toString(),
        user: userDetails,
        createdAt: mockTransaction.createdAt,
        completedAt: mockTransaction.completed_at,
      });
    });

    it('should handle transaction without user details', async () => {
      const result = (service as any).transformTransactionResponse(mockTransaction, null);

      expect(result.user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockTransactionModel.exec.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getAllTransactions({}))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle invalid ObjectId in getUserDetails', async () => {
      userModel.findById.mockRejectedValue(new Error('Invalid ObjectId'));

      const result = await (service as any).getUserDetails('invalid-id', 'farmer');

      expect(result).toBeNull();
    });
  });
});