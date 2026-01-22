import { Test, TestingModule } from '@nestjs/testing';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('LoanController', () => {
  let controller: LoanController;
  let service: jest.Mocked<LoanService>;

  const mockLoanTypeResponse = {
    id: '507f1f77bcf86cd799439011',
    name: 'Input Credit (Fertilizer/Stems)',
    description: 'Farm input credit package',
    category: 'input_credit',
    items: [
      {
        name: 'NPK Fertilizer 50kg',
        unit_price: 2500000,
        quantity: 4,
        total_price: 10000000,
      },
    ],
    total_value: 10000000,
    interest_rate: 10,
    duration_months: 6,
    min_credit_score: 500,
    is_active: true,
    times_issued: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoanResponse = {
    id: '507f1f77bcf86cd799439014',
    reference: 'LOAN20251126001',
    farmer_id: '507f1f77bcf86cd799439012',
    loan_type_id: '507f1f77bcf86cd799439011',
    loan_type_name: 'Input Credit (Fertilizer/Stems)',
    farmer_name: 'John Doe',
    farmer_phone: '08012345678',
    principal_amount: 10000000,
    interest_rate: 10,
    interest_amount: 1000000,
    total_repayment: 11000000,
    purpose: 'Farm inputs',
    duration_months: 6,
    monthly_payment: 1833333,
    amount_paid: 0,
    amount_outstanding: 11000000,
    status: 'active',
    disbursed_at: new Date(),
    due_date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoanKPIs = {
    total_active_loans: 5,
    total_completed_loans: 10,
    total_defaulted_loans: 2,
    total_outstanding_amount: 50000000,
    total_principal_disbursed: 100000000,
    total_amount_repaid: 50000000,
    total_interest_earned: 10000000,
    average_loan_size: 5882353,
    default_rate: 11.76,
    loans_due_in_30_days: 3,
    overdue_loans: 1,
  };

  beforeEach(async () => {
    const mockService = {
      createLoanType: jest.fn(),
      getAllLoanTypes: jest.fn(),
      getLoanTypeById: jest.fn(),
      updateLoanType: jest.fn(),
      toggleLoanTypeActive: jest.fn(),
      deleteLoanType: jest.fn(),
      createLoan: jest.fn(),
      getAllLoans: jest.fn(),
      getLoanById: jest.fn(),
      updateLoanStatus: jest.fn(),
      recordPayment: jest.fn(),
      getLoanKPIs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoanController],
      providers: [
        {
          provide: LoanService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<LoanController>(LoanController);
    service = module.get(LoanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLoanType', () => {
    it('should create a loan type', async () => {
      const createDto = {
        name: 'Input Credit (Fertilizer/Stems)',
        description: 'Farm input credit package',
        category: 'input_credit' as const,
        items: [
          {
            name: 'NPK Fertilizer 50kg',
            unit_price: 2500000,
            quantity: 4,
          },
        ],
        interest_rate: 10,
        duration_months: 6 as const,
      };

      service.createLoanType.mockResolvedValue(mockLoanTypeResponse as any);

      const result = await controller.createLoanType(createDto);

      expect(service.createLoanType).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockLoanTypeResponse);
    });
  });

  describe('getAllLoanTypes', () => {
    it('should return all loan types', async () => {
      service.getAllLoanTypes.mockResolvedValue([mockLoanTypeResponse] as any);

      const result = await controller.getAllLoanTypes();

      expect(service.getAllLoanTypes).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
    });

    it('should return loan types filtered by category', async () => {
      service.getAllLoanTypes.mockResolvedValue([mockLoanTypeResponse] as any);

      const result = await controller.getAllLoanTypes('input_credit');

      expect(service.getAllLoanTypes).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getLoanTypeById', () => {
    it('should return a loan type by ID', async () => {
      service.getLoanTypeById.mockResolvedValue(mockLoanTypeResponse as any);

      const result = await controller.getLoanTypeById('507f1f77bcf86cd799439011');

      expect(service.getLoanTypeById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockLoanTypeResponse);
    });
  });

  describe('updateLoanType', () => {
    it('should update a loan type', async () => {
      const updateDto = { description: 'Updated description' };
      service.updateLoanType.mockResolvedValue(mockLoanTypeResponse as any);

      const result = await controller.updateLoanType(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(service.updateLoanType).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result).toEqual(mockLoanTypeResponse);
    });
  });

  describe('toggleLoanTypeActive', () => {
    it('should toggle loan type active status', async () => {
      service.toggleLoanTypeActive.mockResolvedValue(
        mockLoanTypeResponse as any,
      );

      const result = await controller.toggleLoanTypeActive(
        '507f1f77bcf86cd799439011',
      );

      expect(service.toggleLoanTypeActive).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockLoanTypeResponse);
    });
  });

  describe('deleteLoanType', () => {
    it('should delete a loan type', async () => {
      const deleteResponse = {
        message: 'Loan type "Input Credit (Fertilizer/Stems)" deleted successfully',
      };
      service.deleteLoanType.mockResolvedValue(deleteResponse);

      const result = await controller.deleteLoanType('507f1f77bcf86cd799439011');

      expect(service.deleteLoanType).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('createLoan', () => {
    it('should create a loan', async () => {
      const createDto = {
        farmer_id: '507f1f77bcf86cd799439012',
        loan_type_id: '507f1f77bcf86cd799439011',
        purpose: 'Farm inputs',
        due_date: new Date().toISOString(),
      };

      service.createLoan.mockResolvedValue(mockLoanResponse as any);

      const result = await controller.createLoan(createDto);

      expect(service.createLoan).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockLoanResponse);
    });
  });

  describe('getAllLoans', () => {
    it('should return paginated loans', async () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      const paginatedResponse = {
        loans: [mockLoanResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllLoans.mockResolvedValue(paginatedResponse as any);

      const result = await controller.getAllLoans(filters);

      expect(service.getAllLoans).toHaveBeenCalledWith(filters);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('getLoanKPIs', () => {
    it('should return loan KPIs', async () => {
      service.getLoanKPIs.mockResolvedValue(mockLoanKPIs as any);

      const result = await controller.getLoanKPIs();

      expect(service.getLoanKPIs).toHaveBeenCalled();
      expect(result).toEqual(mockLoanKPIs);
    });
  });

  describe('getLoanById', () => {
    it('should return a loan by ID', async () => {
      service.getLoanById.mockResolvedValue(mockLoanResponse as any);

      const result = await controller.getLoanById('507f1f77bcf86cd799439014');

      expect(service.getLoanById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439014',
      );
      expect(result).toEqual(mockLoanResponse);
    });
  });

  describe('updateLoanStatus', () => {
    it('should update loan status', async () => {
      const updateDto = {
        status: 'completed' as const,
      };

      service.updateLoanStatus.mockResolvedValue({
        ...mockLoanResponse,
        status: 'completed',
      } as any);

      const result = await controller.updateLoanStatus(
        '507f1f77bcf86cd799439014',
        updateDto,
      );

      expect(service.updateLoanStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439014',
        updateDto,
      );
      expect(result.status).toBe('completed');
    });
  });

  describe('recordPayment', () => {
    it('should record loan payment', async () => {
      const paymentDto = {
        amount: 1000000,
      };

      service.recordPayment.mockResolvedValue({
        ...mockLoanResponse,
        amount_paid: 1000000,
      } as any);

      const result = await controller.recordPayment(
        '507f1f77bcf86cd799439014',
        paymentDto,
      );

      expect(service.recordPayment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439014',
        paymentDto,
      );
      expect(result.amount_paid).toBe(1000000);
    });
  });

  describe('getRequestedLoans', () => {
    it('should return all loan requests with status requested', async () => {
      const mockRequests = [
        {
          ...mockLoanResponse,
          status: 'requested',
          pickup_date: undefined,
          approved_at: undefined,
        },
        {
          ...mockLoanResponse,
          id: '507f1f77bcf86cd799439015',
          reference: 'LOAN20251126002',
          status: 'requested',
          pickup_date: undefined,
          approved_at: undefined,
        },
      ];

      (service as any).getRequestedLoans = jest.fn().mockResolvedValue(mockRequests);

      const result = await controller.getRequestedLoans();

      expect((service as any).getRequestedLoans).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('requested');
      expect(result[1].status).toBe('requested');
    });

    it('should return empty array when no loan requests', async () => {
      (service as any).getRequestedLoans = jest.fn().mockResolvedValue([]);

      const result = await controller.getRequestedLoans();

      expect(result).toEqual([]);
    });
  });

  describe('approveLoanRequest', () => {
    it('should approve loan request and set pickup date', async () => {
      const approveDto = {
        pickup_date: '2025-12-01T10:00:00.000Z',
        admin_notes: 'Approved for pickup',
      };

      const approvedLoan = {
        ...mockLoanResponse,
        status: 'approved',
        pickup_date: new Date(approveDto.pickup_date),
        approved_at: new Date(),
      };

      (service as any).approveLoanRequest = jest.fn().mockResolvedValue(approvedLoan);

      const result = await controller.approveLoanRequest(
        '507f1f77bcf86cd799439014',
        approveDto,
      );

      expect((service as any).approveLoanRequest).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439014',
        approveDto,
      );
      expect(result.status).toBe('approved');
      expect(result.pickup_date).toBeDefined();
      expect(result.approved_at).toBeDefined();
    });

    it('should throw error when approving non-requested loan', async () => {
      const approveDto = {
        pickup_date: '2025-12-01T10:00:00.000Z',
      };

      (service as any).approveLoanRequest = jest
        .fn()
        .mockRejectedValue(
          new Error('Cannot approve loan with status: active'),
        );

      await expect(
        controller.approveLoanRequest('507f1f77bcf86cd799439014', approveDto),
      ).rejects.toThrow('Cannot approve loan with status: active');
    });
  });
});
