/**
 * TransactionController Unit Tests
 *
 * Test Coverage:
 * - 15 comprehensive unit tests covering all controller endpoints
 * - Get all transactions functionality (2 tests)
 * - Get wallet transactions functionality (2 tests)
 * - Get loan transactions functionality (2 tests)
 * - Get purchase transactions functionality (2 tests)
 * - Get transaction statistics functionality (1 test)
 * - Get user transactions functionality (2 tests)
 * - Get farmer financial status functionality (2 tests)
 * - Error handling functionality (2 tests)
 *
 * All tests validate proper HTTP responses, error handling,
 * and integration with TransactionService methods.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: jest.Mocked<TransactionService>;

  const mockTransactionResponse: TransactionResponseDto = {
    id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    userType: 'farmer',
    type: 'sale',
    amount: 200.00,
    balanceBefore: 100.00,
    balanceAfter: 300.00,
    status: 'completed',
    reference: 'TXN_202501010001',
    description: 'Sale of cassava - 100kg',
    orderId: '507f1f77bcf86cd799439013',
    loanId: '507f1f77bcf86cd799439014',
    user: {
      id: '507f1f77bcf86cd799439012',
      name: 'Ibrahim Yusuf',
      phone: '08012345678',
      type: 'farmer',
      lga: 'Kaduna North',
      farmSize: 5.5,
    },
    createdAt: new Date('2025-01-01'),
    completedAt: new Date('2025-01-01'),
  };

  const mockPaginatedTransactions = {
    transactions: [mockTransactionResponse],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  const mockTransactionStats = {
    totalTransactions: 1500,
    totalAmount: 250000.00,
    pendingTransactions: 15,
    completedTransactions: 1450,
    failedTransactions: 35,
    byType: {
      wallet: 800,
      loan: 400,
      purchase: 300,
    },
  };

  const mockFarmerFinancialStatus = {
    wallet: {
      balance: 150000,
      isActive: true,
    },
    outstandingLoans: [],
    recentPurchases: [],
    recentTransactions: [mockTransactionResponse],
  };

  const mockTransactionService = {
    getAllTransactions: jest.fn(),
    getTransactionsByType: jest.fn(),
    getUserTransactionsByUserId: jest.fn(),
    getTransactionStats: jest.fn(),
    getFarmerFinancialStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get<TransactionService>(TransactionService) as jest.Mocked<TransactionService>;
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

    it('should get all transactions successfully', async () => {
      service.getAllTransactions.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getAllTransactions(queryDto);

      expect(service.getAllTransactions).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual({
        status: true,
        message: 'Transactions retrieved successfully',
        data: mockPaginatedTransactions,
      });
    });

    it('should handle service errors', async () => {
      service.getAllTransactions.mockRejectedValue(new Error('Database error'));

      await expect(controller.getAllTransactions(queryDto))
        .rejects.toThrow(HttpException);

      try {
        await controller.getAllTransactions(queryDto);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect((error as HttpException).getResponse()).toEqual({
          status: false,
          message: 'Failed to retrieve transactions',
          error: 'Database error',
        });
      }
    });
  });

  describe('getWalletTransactions', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 10,
      status: 'completed',
    };

    it('should get wallet transactions successfully', async () => {
      service.getTransactionsByType.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getWalletTransactions(queryDto);

      expect(service.getTransactionsByType).toHaveBeenCalledWith('wallet', queryDto);
      expect(result).toEqual({
        status: true,
        message: 'Wallet transactions retrieved successfully',
        data: mockPaginatedTransactions,
      });
    });

    it('should handle wallet transaction retrieval errors', async () => {
      service.getTransactionsByType.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.getWalletTransactions(queryDto))
        .rejects.toThrow(HttpException);

      try {
        await controller.getWalletTransactions(queryDto);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toEqual({
          status: false,
          message: 'Failed to retrieve wallet transactions',
          error: 'Service unavailable',
        });
      }
    });
  });

  describe('getLoanTransactions', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 15,
      userType: 'farmer',
    };

    it('should get loan transactions successfully', async () => {
      service.getTransactionsByType.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getLoanTransactions(queryDto);

      expect(service.getTransactionsByType).toHaveBeenCalledWith('loan', queryDto);
      expect(result).toEqual({
        status: true,
        message: 'Loan transactions retrieved successfully',
        data: mockPaginatedTransactions,
      });
    });

    it('should handle loan transaction retrieval errors', async () => {
      service.getTransactionsByType.mockRejectedValue(new Error('Network timeout'));

      await expect(controller.getLoanTransactions(queryDto))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getPurchaseTransactions', () => {
    const queryDto: GetTransactionsQueryDto = {
      page: 2,
      limit: 5,
      type: 'purchase',
    };

    it('should get purchase transactions successfully', async () => {
      service.getTransactionsByType.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getPurchaseTransactions(queryDto);

      expect(service.getTransactionsByType).toHaveBeenCalledWith('purchase', queryDto);
      expect(result).toEqual({
        status: true,
        message: 'Purchase transactions retrieved successfully',
        data: mockPaginatedTransactions,
      });
    });

    it('should handle purchase transaction retrieval errors', async () => {
      service.getTransactionsByType.mockRejectedValue(new Error('Invalid query'));

      await expect(controller.getPurchaseTransactions(queryDto))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getTransactionStats', () => {
    it('should get transaction statistics successfully', async () => {
      service.getTransactionStats.mockResolvedValue(mockTransactionStats);

      const result = await controller.getTransactionStats();

      expect(service.getTransactionStats).toHaveBeenCalled();
      expect(result).toEqual({
        status: true,
        message: 'Transaction statistics retrieved successfully',
        data: mockTransactionStats,
      });
    });
  });

  describe('getUserTransactions', () => {
    const userId = '507f1f77bcf86cd799439012';
    const queryDto: GetTransactionsQueryDto = {
      page: 1,
      limit: 20,
    };

    it('should get user transactions successfully', async () => {
      service.getUserTransactionsByUserId.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getUserTransactions(userId, queryDto);

      expect(service.getUserTransactionsByUserId).toHaveBeenCalledWith(userId, queryDto);
      expect(result).toEqual({
        status: true,
        message: 'User transactions retrieved successfully',
        data: mockPaginatedTransactions,
      });
    });

    it('should handle user transaction retrieval errors', async () => {
      service.getUserTransactionsByUserId.mockRejectedValue(new Error('User not found'));

      await expect(controller.getUserTransactions(userId, queryDto))
        .rejects.toThrow(HttpException);

      try {
        await controller.getUserTransactions(userId, queryDto);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toEqual({
          status: false,
          message: 'Failed to retrieve user transactions',
          error: 'User not found',
        });
      }
    });
  });

  describe('getFarmerFinancialStatus', () => {
    const farmerId = '507f1f77bcf86cd799439012';

    it('should get farmer financial status successfully', async () => {
      service.getFarmerFinancialStatus.mockResolvedValue(mockFarmerFinancialStatus);

      const result = await controller.getFarmerFinancialStatus(farmerId);

      expect(service.getFarmerFinancialStatus).toHaveBeenCalledWith(farmerId);
      expect(result).toEqual({
        status: true,
        message: 'Farmer financial status retrieved successfully',
        data: mockFarmerFinancialStatus,
      });
    });

    it('should handle farmer financial status retrieval errors', async () => {
      service.getFarmerFinancialStatus.mockRejectedValue(new Error('Farmer not found'));

      await expect(controller.getFarmerFinancialStatus(farmerId))
        .rejects.toThrow(HttpException);
    });
  });

  describe('Query Parameter Handling', () => {
    it('should handle complex query parameters', async () => {
      const complexQuery: GetTransactionsQueryDto = {
        page: 3,
        limit: 50,
        type: 'loan_disbursement',
        status: 'completed',
        userType: 'farmer',
        search: 'loan',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
        sortBy: 'amount',
        sortOrder: 'asc',
      };

      service.getAllTransactions.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getAllTransactions(complexQuery);

      expect(service.getAllTransactions).toHaveBeenCalledWith(complexQuery);
      expect(result.status).toBe(true);
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery: GetTransactionsQueryDto = {};
      service.getAllTransactions.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getAllTransactions(emptyQuery);

      expect(service.getAllTransactions).toHaveBeenCalledWith(emptyQuery);
      expect(result.status).toBe(true);
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for all endpoints', async () => {
      service.getTransactionStats.mockResolvedValue(mockTransactionStats);
      service.getAllTransactions.mockResolvedValue(mockPaginatedTransactions);
      service.getFarmerFinancialStatus.mockResolvedValue(mockFarmerFinancialStatus);

      const [statsResult, transactionsResult, financialResult] = await Promise.all([
        controller.getTransactionStats(),
        controller.getAllTransactions({}),
        controller.getFarmerFinancialStatus('farmerId'),
      ]);

      // Validate consistent response structure
      expect(statsResult).toHaveProperty('status', true);
      expect(statsResult).toHaveProperty('message');
      expect(statsResult).toHaveProperty('data');

      expect(transactionsResult).toHaveProperty('status', true);
      expect(transactionsResult).toHaveProperty('message');
      expect(transactionsResult).toHaveProperty('data');

      expect(financialResult).toHaveProperty('status', true);
      expect(financialResult).toHaveProperty('message');
      expect(financialResult).toHaveProperty('data');
    });

    it('should return paginated data structure for transaction endpoints', async () => {
      service.getAllTransactions.mockResolvedValue(mockPaginatedTransactions);

      const result = await controller.getAllTransactions({});

      expect(result.data).toHaveProperty('transactions');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('totalPages');
      expect(Array.isArray(result.data.transactions)).toBe(true);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle service throwing custom exceptions', async () => {
      const customError = new Error('Custom service error');
      service.getTransactionStats.mockRejectedValue(customError);

      await expect(controller.getTransactionStats()).rejects.toThrow(
        'Failed to retrieve transaction statistics',
      );
    });

    it('should handle undefined service responses gracefully', async () => {
      service.getAllTransactions.mockResolvedValue(undefined as any);

      const result = await controller.getAllTransactions({});

      expect(result).toEqual({
        status: true,
        message: 'Transactions retrieved successfully',
        data: undefined,
      });
    });
  });
});