import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';
import { LoanTypeRepository } from './loan-type.repository';
import { Farmer } from '../../schemas/farmer.schema';
import { User } from '../../schemas/user.schema';

describe('LoanService', () => {
  let service: LoanService;
  let loanRepository: jest.Mocked<LoanRepository>;
  let loanTypeRepository: jest.Mocked<LoanTypeRepository>;
  let farmerModel: any;
  let userModel: any;

  const mockLoanType = {
    _id: '507f1f77bcf86cd799439011',
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
    toObject: function () {
      return { ...this };
    },
  };

  const mockFarmer = {
    _id: '507f1f77bcf86cd799439012',
    user_id: '507f1f77bcf86cd799439013',
    first_name: 'John',
    last_name: 'Doe',
    lga: 'Kaduna North',
    farm_size_hectares: 5,
    credit_score: 600,
    loan_defaults: 0,
    active_loan: false,
    completed_sales: 10,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439013',
    phone: '08012345678',
    user_type: 'farmer',
  };

  const mockLoan = {
    _id: '507f1f77bcf86cd799439014',
    reference: 'LOAN20251126001',
    farmer_id: mockFarmer._id,
    loan_type_id: mockLoanType._id,
    loan_type_name: mockLoanType.name,
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
    toObject: function () {
      return { ...this };
    },
  };

  beforeEach(async () => {
    const mockLoanRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByReference: jest.fn(),
      findByFarmerId: jest.fn(),
      findActiveLoansByFarmerId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      recordPayment: jest.fn(),
      updateStatus: jest.fn(),
      getStatistics: jest.fn(),
      generateReference: jest.fn(),
      hasActiveLoan: jest.fn(),
      getFarmerLoanCount: jest.fn(),
    };

    const mockLoanTypeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      incrementTimesIssued: jest.fn(),
      toggleActive: jest.fn(),
    };

    const mockFarmerModel = {
      findById: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockUserModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        {
          provide: LoanRepository,
          useValue: mockLoanRepository,
        },
        {
          provide: LoanTypeRepository,
          useValue: mockLoanTypeRepository,
        },
        {
          provide: getModelToken(Farmer.name),
          useValue: mockFarmerModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    loanRepository = module.get(LoanRepository);
    loanTypeRepository = module.get(LoanTypeRepository);
    farmerModel = module.get(getModelToken(Farmer.name));
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLoanType', () => {
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

    it('should create a loan type successfully', async () => {
      loanTypeRepository.findByName.mockResolvedValue(null);
      loanTypeRepository.create.mockResolvedValue(mockLoanType as any);

      const result = await service.createLoanType(createDto);

      expect(loanTypeRepository.findByName).toHaveBeenCalledWith(createDto.name);
      expect(loanTypeRepository.create).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe(mockLoanType.name);
    });

    it('should throw ConflictException if loan type with same name exists', async () => {
      loanTypeRepository.findByName.mockResolvedValue(mockLoanType as any);

      await expect(service.createLoanType(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(loanTypeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllLoanTypes', () => {
    it('should return all loan types', async () => {
      loanTypeRepository.findAll.mockResolvedValue([mockLoanType] as any);

      const result = await service.getAllLoanTypes({});

      expect(loanTypeRepository.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockLoanType.name);
    });

    it('should return loan types filtered by category', async () => {
      loanTypeRepository.findAll.mockResolvedValue([mockLoanType] as any);

      const result = await service.getAllLoanTypes({
        category: 'input_credit',
      });

      expect(loanTypeRepository.findAll).toHaveBeenCalledWith({
        category: 'input_credit',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getLoanTypeById', () => {
    it('should return a loan type by ID', async () => {
      loanTypeRepository.findById.mockResolvedValue(mockLoanType as any);

      const result = await service.getLoanTypeById(mockLoanType._id);

      expect(loanTypeRepository.findById).toHaveBeenCalledWith(mockLoanType._id);
      expect(result.name).toBe(mockLoanType.name);
    });

    it('should throw NotFoundException if loan type not found', async () => {
      loanTypeRepository.findById.mockResolvedValue(null);

      await expect(service.getLoanTypeById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createLoan', () => {
    const createDto = {
      farmer_id: mockFarmer._id,
      loan_type_id: mockLoanType._id,
      purpose: 'Farm inputs',
      due_date: new Date().toISOString(),
    };

    beforeEach(() => {
      farmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      loanTypeRepository.findById.mockResolvedValue(mockLoanType as any);
      loanRepository.hasActiveLoan.mockResolvedValue(false);
      loanRepository.generateReference.mockResolvedValue('LOAN20251126001');
      loanRepository.create.mockResolvedValue(mockLoan as any);
      loanTypeRepository.incrementTimesIssued.mockResolvedValue(undefined);
    });

    it('should create a loan successfully', async () => {
      const result = await service.createLoan(createDto);

      expect(farmerModel.findById).toHaveBeenCalledWith(createDto.farmer_id);
      expect(loanTypeRepository.findById).toHaveBeenCalledWith(
        createDto.loan_type_id,
      );
      expect(loanRepository.hasActiveLoan).toHaveBeenCalledWith(
        createDto.farmer_id,
      );
      expect(loanRepository.create).toHaveBeenCalled();
      expect(result.reference).toBe(mockLoan.reference);
    });

    it('should throw NotFoundException if farmer not found', async () => {
      farmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.createLoan(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if farmer has active loan', async () => {
      loanRepository.hasActiveLoan.mockResolvedValue(true);

      await expect(service.createLoan(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if farmer credit score is too low', async () => {
      const lowScoreFarmer = { ...mockFarmer, credit_score: 400 };
      farmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(lowScoreFarmer),
      });

      await expect(service.createLoan(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if loan type is not active', async () => {
      const inactiveLoanType = { ...mockLoanType, is_active: false };
      loanTypeRepository.findById.mockResolvedValue(inactiveLoanType as any);

      await expect(service.createLoan(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllLoans', () => {
    it('should return paginated loans', async () => {
      loanRepository.findAll.mockResolvedValue({
        loans: [mockLoan] as any,
        total: 1,
      });

      const result = await service.getAllLoans({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(loanRepository.findAll).toHaveBeenCalled();
      expect(result.loans).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getLoanById', () => {
    it('should return a loan by ID', async () => {
      loanRepository.findById.mockResolvedValue(mockLoan as any);

      const result = await service.getLoanById(mockLoan._id);

      expect(loanRepository.findById).toHaveBeenCalledWith(mockLoan._id);
      expect(result.reference).toBe(mockLoan.reference);
    });

    it('should throw NotFoundException if loan not found', async () => {
      loanRepository.findById.mockResolvedValue(null);

      await expect(service.getLoanById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLoanStatus', () => {
    const updateDto = {
      status: 'completed' as const,
    };

    it('should update loan status successfully', async () => {
      loanRepository.findById.mockResolvedValue(mockLoan as any);
      loanRepository.updateStatus.mockResolvedValue({
        ...mockLoan,
        status: 'completed',
      } as any);
      farmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });

      const result = await service.updateLoanStatus(mockLoan._id, updateDto);

      expect(loanRepository.updateStatus).toHaveBeenCalledWith(
        mockLoan._id,
        'completed',
      );
      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException if loan not found', async () => {
      loanRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateLoanStatus('invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    const paymentDto = {
      amount: 1000000,
    };

    it('should record payment successfully', async () => {
      loanRepository.findById.mockResolvedValue(mockLoan as any);
      loanRepository.recordPayment.mockResolvedValue({
        ...mockLoan,
        amount_paid: 1000000,
      } as any);

      const result = await service.recordPayment(mockLoan._id, paymentDto);

      expect(loanRepository.recordPayment).toHaveBeenCalledWith(
        mockLoan._id,
        paymentDto.amount,
      );
      expect(result.amount_paid).toBe(1000000);
    });

    it('should throw NotFoundException if loan not found', async () => {
      loanRepository.findById.mockResolvedValue(null);

      await expect(
        service.recordPayment('invalid-id', paymentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid payment amount', async () => {
      loanRepository.findById.mockResolvedValue(mockLoan as any);
      const invalidPayment = { amount: -1000 };

      await expect(
        service.recordPayment(mockLoan._id, invalidPayment),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment exceeds outstanding', async () => {
      loanRepository.findById.mockResolvedValue(mockLoan as any);
      const excessPayment = { amount: 20000000 };

      await expect(
        service.recordPayment(mockLoan._id, excessPayment),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLoanKPIs', () => {
    it('should return loan KPIs', async () => {
      loanRepository.getStatistics.mockResolvedValue({
        total_active: 5,
        total_completed: 10,
        total_defaulted: 2,
        total_outstanding: 50000000,
        total_disbursed: 100000000,
        total_repaid: 50000000,
        loans_due_30_days: 3,
        overdue_loans: 1,
      });

      const result = await service.getLoanKPIs();

      expect(loanRepository.getStatistics).toHaveBeenCalled();
      expect(result.total_active_loans).toBe(5);
      expect(result.total_completed_loans).toBe(10);
      expect(result.total_defaulted_loans).toBe(2);
      expect(result.default_rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('toggleLoanTypeActive', () => {
    it('should toggle loan type active status', async () => {
      const toggledLoanType = { ...mockLoanType, is_active: false };
      loanTypeRepository.toggleActive.mockResolvedValue(toggledLoanType as any);

      const result = await service.toggleLoanTypeActive(mockLoanType._id);

      expect(loanTypeRepository.toggleActive).toHaveBeenCalledWith(
        mockLoanType._id,
      );
      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException if loan type not found', async () => {
      loanTypeRepository.toggleActive.mockResolvedValue(null);

      await expect(service.toggleLoanTypeActive('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteLoanType', () => {
    it('should delete loan type successfully', async () => {
      loanTypeRepository.findById.mockResolvedValue(mockLoanType as any);
      loanTypeRepository.delete.mockResolvedValue(true);

      const result = await service.deleteLoanType(mockLoanType._id);

      expect(loanTypeRepository.delete).toHaveBeenCalledWith(mockLoanType._id);
      expect(result.message).toContain('deleted successfully');
    });

    it('should throw NotFoundException if loan type not found', async () => {
      loanTypeRepository.findById.mockResolvedValue(null);

      await expect(service.deleteLoanType('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createLoanRequest', () => {
    it('should create loan request with requested status', async () => {
      farmerModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      userModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      loanRepository.hasActiveLoan.mockResolvedValue(false);
      loanTypeRepository.findById.mockResolvedValue(mockLoanType as any);
      loanRepository.generateReference.mockResolvedValue('LOAN20251127001');

      const requestedLoan = {
        ...mockLoan,
        status: 'requested',
        principal_amount: 0,
        items: [],
      };
      loanRepository.create.mockResolvedValue(requestedLoan as any);

      const createDto = {
        loan_type_id: mockLoanType._id,
        purpose: 'Need fertilizer for farm',
      };

      const result = await service.createLoanRequest(mockFarmer._id, createDto);

      expect(farmerModel.findById).toHaveBeenCalledWith(mockFarmer._id);
      expect(loanRepository.hasActiveLoan).toHaveBeenCalledWith(
        mockFarmer._id,
      );
      expect(loanTypeRepository.findById).toHaveBeenCalledWith(
        mockLoanType._id,
      );
      expect(loanRepository.create).toHaveBeenCalled();
      expect(result.status).toBe('requested');
      expect(result.reference).toBe('LOAN20251127001');
    });

    it('should throw BadRequestException if farmer has active loan', async () => {
      farmerModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      userModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      loanRepository.hasActiveLoan.mockResolvedValue(true);

      const createDto = {
        loan_type_id: mockLoanType._id,
      };

      await expect(
        service.createLoanRequest(mockFarmer._id, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if farmer has defaults', async () => {
      const farmerWithDefaults = {
        ...mockFarmer,
        loan_defaults: 2,
      };

      farmerModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(farmerWithDefaults),
      });
      userModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      loanRepository.hasActiveLoan.mockResolvedValue(false);
      loanTypeRepository.findById.mockResolvedValue(mockLoanType as any);

      const createDto = {
        loan_type_id: mockLoanType._id,
      };

      await expect(
        service.createLoanRequest(mockFarmer._id, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRequestedLoans', () => {
    it('should return all loans with requested status', async () => {
      const requestedLoans = [
        { ...mockLoan, status: 'requested' },
        { ...mockLoan, _id: '507f1f77bcf86cd799439015', status: 'requested' },
      ];

      loanRepository.findAll.mockResolvedValue({
        loans: requestedLoans as any,
        total: 2,
      });

      const result = await service.getRequestedLoans();

      expect(loanRepository.findAll).toHaveBeenCalledWith({
        status: 'requested',
        page: 1,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('requested');
    });

    it('should return empty array when no requests', async () => {
      loanRepository.findAll.mockResolvedValue({
        loans: [],
        total: 0,
      });

      const result = await service.getRequestedLoans();

      expect(result).toEqual([]);
    });
  });

  describe('approveLoanRequest', () => {
    it('should approve loan request and set pickup date', async () => {
      const requestedLoan = {
        ...mockLoan,
        status: 'requested',
        save: jest.fn().mockResolvedValue({
          ...mockLoan,
          status: 'approved',
          pickup_date: new Date('2025-12-01'),
          approved_at: new Date(),
        }),
      };

      loanRepository.findById.mockResolvedValue(requestedLoan as any);

      const approveDto = {
        pickup_date: '2025-12-01T10:00:00.000Z',
        admin_notes: 'Approved',
      };

      const result = await service.approveLoanRequest(mockLoan._id, approveDto);

      expect(loanRepository.findById).toHaveBeenCalledWith(mockLoan._id);
      expect(requestedLoan.save).toHaveBeenCalled();
      expect(result.status).toBe('approved');
    });

    it('should throw NotFoundException if loan not found', async () => {
      loanRepository.findById.mockResolvedValue(null);

      const approveDto = {
        pickup_date: '2025-12-01T10:00:00.000Z',
      };

      await expect(
        service.approveLoanRequest('invalid-id', approveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if loan is not in requested status', async () => {
      const activeLoan = {
        ...mockLoan,
        status: 'active',
      };

      loanRepository.findById.mockResolvedValue(activeLoan as any);

      const approveDto = {
        pickup_date: '2025-12-01T10:00:00.000Z',
      };

      await expect(
        service.approveLoanRequest(mockLoan._id, approveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
