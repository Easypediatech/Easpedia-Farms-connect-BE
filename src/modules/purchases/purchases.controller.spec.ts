/**
 * PurchasesController Unit Tests
 *
 * Test Coverage:
 * - 12 comprehensive unit tests covering all controller endpoints
 * - Create purchase functionality (4 tests)
 * - Get all purchases with filtering and pagination (2 tests)
 * - Get purchase KPIs (1 test)
 * - Get purchase by ID (2 tests)
 * - Update purchase/payment status (2 tests)
 * - Retry failed purchase (1 test)
 *
 * All tests validate proper HTTP responses, error handling,
 * and integration with PurchasesService methods.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GetPurchasesQueryDto } from './dto/get-purchases-query.dto';

describe('PurchasesController', () => {
  let controller: PurchasesController;
  let service: jest.Mocked<PurchasesService>;

  const mockPurchase = {
    _id: '507f1f77bcf86cd799439011',
    farmerId: '507f1f77bcf86cd799439012',
    farmerName: 'Ibrahim Yusuf',
    farmerPhone: '08012345678',
    weightKg: 100,
    pricePerKg: 20000, // in kobo
    totalAmount: 2000000, // in kobo
    unit: 'kg',
    paymentMethod: 'wallet',
    location: 'Kaduna',
    notes: 'Good quality cassava',
    status: 'completed',
    paymentStatus: 'paid',
    recordedBy: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockKpis = {
    totalPurchases: 150,
    totalAmountSpent: 50000000, // in kobo, converted to naira in response
    completedPurchases: 140,
    pendingPurchases: 10,
    totalWeight: 15000,
    averagePrice: 180000, // in kobo, converted to naira in response
  };

  const mockPaginatedPurchases = {
    purchases: [mockPurchase],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    },
  };

  const mockPurchasesService = {
    createPurchase: jest.fn(),
    getAllPurchases: jest.fn(),
    getKPIs: jest.fn(),
    getPurchaseById: jest.fn(),
    updatePurchaseStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    retryPurchase: jest.fn(),
    getFarmerFinancialStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasesController],
      providers: [
        {
          provide: PurchasesService,
          useValue: mockPurchasesService,
        },
      ],
    }).compile();

    controller = module.get<PurchasesController>(PurchasesController);
    service = module.get<PurchasesService>(PurchasesService) as jest.Mocked<PurchasesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPurchase', () => {
    const createPurchaseDto: CreatePurchaseDto = {
      farmerId: '507f1f77bcf86cd799439012',
      farmerPhone: '08012345678',
      weightKg: 100,
      pricePerKg: 200, // in naira
      unit: 'kg',
      paymentMethod: 'wallet',
      location: 'Kaduna',
      notes: 'Good quality cassava',
    };

    const mockRequest = {
      user: { id: 'admin123' },
    };

    it('should create a purchase successfully', async () => {
      service.createPurchase.mockResolvedValue(mockPurchase as any);

      const result = await controller.createPurchase(createPurchaseDto, mockRequest);

      expect(service.createPurchase).toHaveBeenCalledWith(createPurchaseDto, 'admin123');
      expect(result).toEqual(mockPurchase);
    });

    it('should use default admin ID when request user is not available', async () => {
      const requestWithoutUser = {};
      service.createPurchase.mockResolvedValue(mockPurchase as any);

      const result = await controller.createPurchase(createPurchaseDto, requestWithoutUser);

      expect(service.createPurchase).toHaveBeenCalledWith(createPurchaseDto, 'admin');
      expect(result).toEqual(mockPurchase);
    });

    it('should handle service errors during purchase creation', async () => {
      service.createPurchase.mockRejectedValue(new BadRequestException('Invalid farmer ID'));

      await expect(controller.createPurchase(createPurchaseDto, mockRequest))
        .rejects.toThrow(BadRequestException);
      expect(service.createPurchase).toHaveBeenCalledWith(createPurchaseDto, 'admin123');
    });

    it('should handle cash payment method', async () => {
      const cashPurchaseDto = { ...createPurchaseDto, paymentMethod: 'cash' };
      const cashPurchase = { ...mockPurchase, paymentMethod: 'cash' };
      service.createPurchase.mockResolvedValue(cashPurchase as any);

      const result = await controller.createPurchase(cashPurchaseDto, mockRequest);

      expect(service.createPurchase).toHaveBeenCalledWith(cashPurchaseDto, 'admin123');
      expect(result.paymentMethod).toBe('cash');
    });
  });

  describe('getAllPurchases', () => {
    it('should get all purchases with default pagination', async () => {
      const queryDto: GetPurchasesQueryDto = {};
      service.getAllPurchases.mockResolvedValue(mockPaginatedPurchases as any);

      const result = await controller.getAllPurchases(queryDto);

      expect(service.getAllPurchases).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedPurchases);
    });

    it('should get purchases with filtering and pagination', async () => {
      const queryDto: GetPurchasesQueryDto = {
        page: 2,
        limit: 10,
        status: 'completed',
        paymentStatus: 'paid',
        farmerId: '507f1f77bcf86cd799439012',
      };
      service.getAllPurchases.mockResolvedValue(mockPaginatedPurchases as any);

      const result = await controller.getAllPurchases(queryDto);

      expect(service.getAllPurchases).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedPurchases);
    });
  });

  describe('getKPIs', () => {
    it('should get purchase KPIs successfully', async () => {
      service.getKPIs.mockResolvedValue(mockKpis as any);

      const result = await controller.getKPIs();

      expect(service.getKPIs).toHaveBeenCalled();
      expect(result).toEqual(mockKpis);
    });
  });

  describe('getPurchaseById', () => {
    it('should get purchase by ID successfully', async () => {
      const purchaseId = '507f1f77bcf86cd799439011';
      service.getPurchaseById.mockResolvedValue(mockPurchase as any);

      const result = await controller.getPurchaseById(purchaseId);

      expect(service.getPurchaseById).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual(mockPurchase);
    });

    it('should handle purchase not found', async () => {
      const purchaseId = 'nonexistent';
      service.getPurchaseById.mockRejectedValue(new NotFoundException('Purchase not found'));

      await expect(controller.getPurchaseById(purchaseId))
        .rejects.toThrow(NotFoundException);
      expect(service.getPurchaseById).toHaveBeenCalledWith(purchaseId);
    });
  });

  describe('updatePurchaseStatus', () => {
    it('should update purchase status successfully', async () => {
      const purchaseId = '507f1f77bcf86cd799439011';
      const statusUpdate = { status: 'completed' };
      const updatedPurchase = { ...mockPurchase, status: 'completed' };
      service.updatePurchaseStatus.mockResolvedValue(updatedPurchase as any);

      const result = await controller.updatePurchaseStatus(purchaseId, statusUpdate);

      expect(service.updatePurchaseStatus).toHaveBeenCalledWith(purchaseId, 'completed');
      expect(result).toEqual(updatedPurchase);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      const purchaseId = '507f1f77bcf86cd799439011';
      const paymentUpdate = { paymentStatus: 'paid' };
      const updatedPurchase = { ...mockPurchase, paymentStatus: 'paid' };
      service.updatePaymentStatus.mockResolvedValue(updatedPurchase as any);

      const result = await controller.updatePaymentStatus(purchaseId, paymentUpdate);

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(purchaseId, 'paid');
      expect(result).toEqual(updatedPurchase);
    });
  });

  describe('retryPurchase', () => {
    it('should retry a failed purchase successfully', async () => {
      const purchaseId = '507f1f77bcf86cd799439011';
      const retriedPurchase = { ...mockPurchase, status: 'completed' };
      service.retryPurchase.mockResolvedValue(retriedPurchase as any);

      const result = await controller.retryPurchase(purchaseId);

      expect(service.retryPurchase).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual({
        success: true,
        message: 'Purchase retried successfully',
        data: retriedPurchase,
      });
    });
  });

  describe('getFarmerFinancialStatus', () => {
    it('should get farmer financial status successfully', async () => {
      const farmerId = '507f1f77bcf86cd799439012';
      const financialStatus = {
        walletBalance: 150000,
        totalEarnings: 500000,
        totalPurchases: 25,
        outstandingLoans: 0,
      };
      service.getFarmerFinancialStatus.mockResolvedValue(financialStatus as any);

      const result = await controller.getFarmerFinancialStatus(farmerId);

      expect(service.getFarmerFinancialStatus).toHaveBeenCalledWith(farmerId);
      expect(result).toEqual(financialStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      const createPurchaseDto: CreatePurchaseDto = {
        farmerId: '',
        farmerPhone: '',
        weightKg: -1,
        pricePerKg: -100,
        unit: 'invalid' as any,
        paymentMethod: 'invalid' as any,
      };
      const mockRequest = { user: { id: 'admin123' } };

      service.createPurchase.mockRejectedValue(new BadRequestException('Validation failed'));

      await expect(controller.createPurchase(createPurchaseDto, mockRequest))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle internal server errors', async () => {
      service.getKPIs.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getKPIs()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper response format for retry purchase', async () => {
      const purchaseId = '507f1f77bcf86cd799439011';
      const retriedPurchase = { ...mockPurchase, status: 'completed' };
      service.retryPurchase.mockResolvedValue(retriedPurchase as any);

      const result = await controller.retryPurchase(purchaseId);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Purchase retried successfully');
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(retriedPurchase);
    });

    it('should return paginated response for getAllPurchases', async () => {
      const queryDto: GetPurchasesQueryDto = { page: 1, limit: 20 };
      service.getAllPurchases.mockResolvedValue(mockPaginatedPurchases as any);

      const result = await controller.getAllPurchases(queryDto);

      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('pages');
    });
  });
});