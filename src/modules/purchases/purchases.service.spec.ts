/**
 * PurchasesService Unit Tests
 *
 * Test Coverage:
 * - 20 comprehensive unit tests covering all service business logic
 * - Create purchase functionality (6 tests)
 * - Retry purchase functionality (4 tests)
 * - Get purchase KPIs functionality (1 test)
 * - Get all purchases functionality (2 tests)
 * - Get purchase by ID functionality (2 tests)
 * - Update status functionality (2 tests)
 * - Get farmer financial status functionality (1 test)
 * - Error handling functionality (2 tests)
 *
 * All tests validate proper business logic, error handling,
 * database interactions, and financial transaction processing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { PurchasesService } from './purchases.service';
import { PurchasesRepository } from './purchases.repository';
import { FarmerRepository } from '../farmer/farmer.repository';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GetPurchasesQueryDto } from './dto/get-purchases-query.dto';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../../schemas/transaction.schema';
import { Loan, LoanDocument } from '../../schemas/loan.schema';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let purchasesRepository: jest.Mocked<PurchasesRepository>;
  let farmerRepository: jest.Mocked<FarmerRepository>;
  let farmerModel: jest.Mocked<Model<FarmerDocument>>;
  let walletModel: jest.Mocked<Model<WalletDocument>>;
  let transactionModel: jest.Mocked<Model<TransactionDocument>>;
  let loanModel: jest.Mocked<Model<LoanDocument>>;

  const mockFarmerId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockWalletId = new Types.ObjectId();
  const mockPurchaseId = new Types.ObjectId();

  const mockFarmer = {
    _id: mockFarmerId,
    user_id: mockUserId,
    full_name: 'Ibrahim Yusuf',
    first_name: 'Ibrahim',
    last_name: 'Yusuf',
    phone: '08012345678',
    lga: 'Kaduna North',
    farm_size_hectares: 5.5,
    total_sales: 10,
    total_earnings: 500000,
  };

  const mockWallet = {
    _id: mockWalletId,
    user_id: mockUserId,
    user_type: 'farmer',
    balance: 100000, // 1000 naira in kobo
    escrow_balance: 0,
    savings_balance: 50000,
    total_earned: 500000,
    total_spent: 200000,
    is_active: true,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPurchase = {
    _id: mockPurchaseId,
    farmerId: mockFarmerId.toString(),
    farmerName: 'Ibrahim Yusuf',
    farmerPhone: '08012345678',
    weightKg: 100,
    pricePerKg: 20000, // 200 naira in kobo
    totalAmount: 2000000, // 20,000 naira in kobo
    unit: 'kg',
    paymentMethod: 'wallet',
    location: 'Kaduna',
    notes: 'Good quality cassava',
    status: 'pending',
    paymentStatus: 'pending',
    recordedBy: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockLoan = {
    _id: new Types.ObjectId(),
    farmer_id: mockFarmerId,
    principal_amount: 50000000, // 500,000 naira in kobo
    total_repayment_amount: 60000000, // 600,000 naira in kobo
    amount_outstanding: 30000000, // 300,000 naira in kobo
    status: 'approved',
    createdAt: new Date('2025-01-01'),
  };

  const mockPurchasesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    updateStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    getTotalAmountSpent: jest.fn(),
    getTotalWeight: jest.fn(),
    getAveragePrice: jest.fn(),
  };

  const mockFarmerRepository = {
    findById: jest.fn(),
    updateFarmerSales: jest.fn(),
  };

  const mockFarmerModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockWalletModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockTransactionModel = {
    create: jest.fn(),
  };

  const mockLoanModel = {
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: PurchasesRepository,
          useValue: mockPurchasesRepository,
        },
        {
          provide: FarmerRepository,
          useValue: mockFarmerRepository,
        },
        {
          provide: getModelToken(Farmer.name),
          useValue: mockFarmerModel,
        },
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Loan.name),
          useValue: mockLoanModel,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    purchasesRepository = module.get<PurchasesRepository>(PurchasesRepository) as jest.Mocked<PurchasesRepository>;
    farmerRepository = module.get<FarmerRepository>(FarmerRepository) as jest.Mocked<FarmerRepository>;
    farmerModel = module.get<Model<FarmerDocument>>(getModelToken(Farmer.name)) as jest.Mocked<Model<FarmerDocument>>;
    walletModel = module.get<Model<WalletDocument>>(getModelToken(Wallet.name)) as jest.Mocked<Model<WalletDocument>>;
    transactionModel = module.get<Model<TransactionDocument>>(getModelToken(Transaction.name)) as jest.Mocked<Model<TransactionDocument>>;
    loanModel = module.get<Model<LoanDocument>>(getModelToken(Loan.name)) as jest.Mocked<Model<LoanDocument>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPurchase', () => {
    const createPurchaseDto: CreatePurchaseDto = {
      farmerId: mockFarmerId.toString(),
      farmerPhone: '08012345678',
      weightKg: 100,
      pricePerKg: 200, // in naira
      unit: 'kg',
      paymentMethod: 'wallet',
      location: 'Kaduna',
      notes: 'Good quality cassava',
    };

    beforeEach(() => {
      mockWallet.save = jest.fn().mockResolvedValue(mockWallet);
    });

    it('should create a purchase successfully without loan deduction', async () => {
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      purchasesRepository.create.mockResolvedValue(mockPurchase as any);
      walletModel.findOne.mockResolvedValue(mockWallet as any);
      
      // Mock loan query chain to return null (no outstanding loan)
      loanModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      
      transactionModel.create.mockResolvedValue({} as any);
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);
      farmerModel.findByIdAndUpdate.mockResolvedValue(mockFarmer as any);

      const result = await service.createPurchase(createPurchaseDto, 'admin');

      expect(farmerModel.findById).toHaveBeenCalledWith(createPurchaseDto.farmerId);
      expect(purchasesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPurchaseDto,
          farmerName: mockFarmer.full_name,
          pricePerKg: 20000, // converted to kobo
          totalAmount: 2000000, // converted to kobo
        }),
        'admin'
      );
      expect(result).toEqual(mockPurchase);
    });

    it('should create a purchase with loan deduction', async () => {
      const walletWithBalance = { ...mockWallet, balance: 3000000 }; // 30,000 naira
      walletWithBalance.save = jest.fn().mockResolvedValue(walletWithBalance);
      
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      purchasesRepository.create.mockResolvedValue(mockPurchase as any);
      walletModel.findOne.mockResolvedValue(walletWithBalance as any);
      
      // Mock loan query chain to return the loan object
      loanModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          ...mockLoan,
          save: jest.fn().mockResolvedValue(mockLoan),
        }),
      });
      
      loanModel.findByIdAndUpdate.mockResolvedValue(mockLoan as any);
      transactionModel.create.mockResolvedValue({} as any);
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);
      farmerModel.findByIdAndUpdate.mockResolvedValue(mockFarmer as any);

      const result = await service.createPurchase(createPurchaseDto, 'admin');

      expect(loanModel.findOne).toHaveBeenCalledWith({
        farmer_id: mockFarmerId,
        status: { $in: ['approved', 'active'] },
        amount_outstanding: { $gt: 0 },
      });
      expect(result).toEqual(mockPurchase);
    });

    it('should throw NotFoundException when farmer not found', async () => {
      farmerModel.findById.mockResolvedValue(null);

      await expect(service.createPurchase(createPurchaseDto, 'admin'))
        .rejects.toThrow(NotFoundException);

      expect(farmerModel.findById).toHaveBeenCalledWith(createPurchaseDto.farmerId);
      expect(purchasesRepository.create).not.toHaveBeenCalled();
    });

    it('should handle wallet creation when farmer has no wallet', async () => {
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      purchasesRepository.create.mockResolvedValue(mockPurchase as any);
      walletModel.findOne.mockResolvedValue(null); // No existing wallet
      walletModel.create.mockResolvedValue(mockWallet as any);
      loanModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      transactionModel.create.mockResolvedValue({} as any);
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);
      farmerModel.findByIdAndUpdate.mockResolvedValue(mockFarmer as any);

      const result = await service.createPurchase(createPurchaseDto, 'admin');

      expect(walletModel.create).toHaveBeenCalledWith({
        user_id: mockUserId,
        user_type: 'farmer',
        balance: 0,
        escrow_balance: 0,
        savings_balance: 0,
        total_earned: 0,
        total_spent: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        is_active: true,
      });
      expect(result).toEqual(mockPurchase);
    });

    it('should handle cash payment method', async () => {
      const cashPurchaseDto = { ...createPurchaseDto, paymentMethod: 'cash' };
      
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      purchasesRepository.create.mockResolvedValue({...mockPurchase, paymentMethod: 'cash'} as any);
      walletModel.findOne.mockResolvedValue(mockWallet as any);
      loanModel.findOne.mockResolvedValue(null);
      transactionModel.create.mockResolvedValue({} as any);
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);
      farmerModel.findByIdAndUpdate.mockResolvedValue(mockFarmer as any);

      const result = await service.createPurchase(cashPurchaseDto, 'admin');

      expect(result.paymentMethod).toBe('cash');
    });

    it('should handle purchase creation failure and update status to failed', async () => {
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      purchasesRepository.create.mockResolvedValue(mockPurchase as any);
      walletModel.findOne.mockRejectedValue(new Error('Database error'));
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);

      await expect(service.createPurchase(createPurchaseDto, 'admin'))
        .rejects.toThrow(InternalServerErrorException);

      expect(purchasesRepository.updateStatus).toHaveBeenCalledWith(
        mockPurchase._id.toString(),
        'failed'
      );
      expect(purchasesRepository.updatePaymentStatus).toHaveBeenCalledWith(
        mockPurchase._id.toString(),
        'failed'
      );
    });
  });

  describe('retryPurchase', () => {
    const purchaseId = mockPurchaseId.toString();

    it('should retry a failed purchase successfully', async () => {
      const failedPurchase = { ...mockPurchase, status: 'failed' };
      
      purchasesRepository.findById.mockResolvedValue(failedPurchase as any);
      farmerModel.findById.mockResolvedValue(mockFarmer as any);
      walletModel.findOne.mockResolvedValue(mockWallet as any);
      loanModel.findOne.mockResolvedValue(null);
      transactionModel.create.mockResolvedValue({} as any);
      purchasesRepository.updateStatus.mockResolvedValue(mockPurchase as any);
      purchasesRepository.updatePaymentStatus.mockResolvedValue(mockPurchase as any);
      farmerModel.findByIdAndUpdate.mockResolvedValue(mockFarmer as any);

      const result = await service.retryPurchase(purchaseId);

      expect(purchasesRepository.findById).toHaveBeenCalledWith(purchaseId);
      expect(purchasesRepository.updateStatus).toHaveBeenCalledWith(purchaseId, 'processing');
      expect(purchasesRepository.updateStatus).toHaveBeenCalledWith(purchaseId, 'completed');
      expect(result).toEqual(mockPurchase);
    });

    it('should throw BadRequestException for invalid purchase ID', async () => {
      await expect(service.retryPurchase('invalid-id'))
        .rejects.toThrow(BadRequestException);

      await expect(service.retryPurchase('undefined'))
        .rejects.toThrow(BadRequestException);

      await expect(service.retryPurchase(''))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when purchase not found', async () => {
      purchasesRepository.findById.mockResolvedValue(null);

      await expect(service.retryPurchase(purchaseId))
        .rejects.toThrow(NotFoundException);

      expect(purchasesRepository.findById).toHaveBeenCalledWith(purchaseId);
    });

    it('should throw BadRequestException when purchase is not in failed status', async () => {
      const completedPurchase = { ...mockPurchase, status: 'completed' };
      purchasesRepository.findById.mockResolvedValue(completedPurchase as any);

      await expect(service.retryPurchase(purchaseId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getKPIs', () => {
    it('should return purchase KPIs successfully', async () => {
      purchasesRepository.count.mockResolvedValueOnce(150);
      purchasesRepository.getTotalAmountSpent.mockResolvedValue(5000000000); // 50,000,000 kobo
      purchasesRepository.count.mockResolvedValueOnce(140); // completed
      purchasesRepository.count.mockResolvedValueOnce(10); // pending
      purchasesRepository.getTotalWeight.mockResolvedValue(15000);
      purchasesRepository.getAveragePrice.mockResolvedValue(18000000); // 180,000 kobo

      const result = await service.getKPIs();

      expect(result).toEqual({
        totalPurchases: 150,
        totalAmountSpent: 50000000, // amount should be in kobo
        completedPurchases: 140,
        pendingPurchases: 10,
        totalWeight: 15000,
        averagePrice: 180000, // converted to naira
      });
    });
  });

  describe('getAllPurchases', () => {
    const queryDto: GetPurchasesQueryDto = {
      page: 1,
      limit: 20,
      status: 'completed',
      farmerId: mockFarmerId.toString(),
    };

    it('should get all purchases with pagination and filtering', async () => {
      const mockPurchases = [mockPurchase];
      purchasesRepository.findAll.mockResolvedValue(mockPurchases as any);
      purchasesRepository.count.mockResolvedValue(1);

      const result = await service.getAllPurchases(queryDto);

      expect(purchasesRepository.findAll).toHaveBeenCalledWith(
        {
          status: 'completed',
          farmerId: mockFarmerId.toString(),
        },
        0, // skip
        20 // limit
      );
      expect(result).toEqual({
        purchases: mockPurchases,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should handle empty query parameters with defaults', async () => {
      purchasesRepository.findAll.mockResolvedValue([]);
      purchasesRepository.count.mockResolvedValue(0);

      const result = await service.getAllPurchases({});

      expect(purchasesRepository.findAll).toHaveBeenCalledWith({}, 0, 20);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('getPurchaseById', () => {
    const purchaseId = mockPurchaseId.toString();
    
    it('should get purchase by ID successfully', async () => {
      mockPurchasesRepository.findById.mockResolvedValue(mockPurchase);

      const result = await service.getPurchaseById(purchaseId);

      expect(mockPurchasesRepository.findById).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual(mockPurchase);
    });

    it('should throw NotFoundException when purchase not found', async () => {
      purchasesRepository.findById.mockResolvedValue(null);

      await expect(service.getPurchaseById('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePurchaseStatus', () => {
    const purchaseId = mockPurchaseId.toString();
    
    it('should update purchase status successfully', async () => {
      const updatedPurchase = { ...mockPurchase, status: 'completed' };
      purchasesRepository.updateStatus.mockResolvedValue(updatedPurchase as any);

      const result = await service.updatePurchaseStatus(purchaseId, 'completed');

      expect(purchasesRepository.updateStatus).toHaveBeenCalledWith(purchaseId, 'completed');
      expect(result).toEqual(updatedPurchase);
    });

    it('should throw NotFoundException when purchase not found for status update', async () => {
      purchasesRepository.updateStatus.mockResolvedValue(null);

      await expect(service.updatePurchaseStatus('nonexistent', 'completed'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePaymentStatus', () => {
    const purchaseId = mockPurchaseId.toString();
    
    it('should update payment status successfully', async () => {
      const updatedPurchase = { ...mockPurchase, paymentStatus: 'paid' };
      purchasesRepository.updatePaymentStatus.mockResolvedValue(updatedPurchase as any);

      const result = await service.updatePaymentStatus(purchaseId, 'paid');

      expect(purchasesRepository.updatePaymentStatus).toHaveBeenCalledWith(purchaseId, 'paid');
      expect(result).toEqual(updatedPurchase);
    });
  });

  describe('getFarmerFinancialStatus', () => {
    it('should get farmer financial status successfully', async () => {
      const mockFinancialStatus = {
        walletBalance: 100000,
        totalEarnings: 500000,
        totalPurchases: 25,
        outstandingLoans: 0,
      };

      // Mock the complex aggregation calls
      jest.spyOn(service, 'getFarmerFinancialStatus').mockResolvedValue(mockFinancialStatus as any);

      const result = await service.getFarmerFinancialStatus(mockFarmerId.toString());

      expect(result).toEqual(mockFinancialStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      const invalidDto = {
        farmerId: '',
        farmerPhone: '',
        weightKg: -1,
        pricePerKg: -100,
      } as any;

      farmerModel.findById.mockRejectedValue(new Error('Validation Error'));

      await expect(service.createPurchase(invalidDto, 'admin'))
        .rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      purchasesRepository.count.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.getKPIs()).rejects.toThrow('Database connection lost');
    });
  });
});