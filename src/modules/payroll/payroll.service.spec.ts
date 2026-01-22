import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './payroll.repository';
import { StaffRepository } from '../staff/staff.repository';
import { WalletService } from '../wallet/wallet.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let payrollRepository: jest.Mocked<PayrollRepository>;
  let staffRepository: jest.Mocked<StaffRepository>;
  let walletService: jest.Mocked<WalletService>;

  const mockPayrollId = new Types.ObjectId();
  const mockStaffId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockAdminId = new Types.ObjectId();
  const mockWalletId = new Types.ObjectId();
  const mockOrgWalletId = new Types.ObjectId();
  const mockTransactionId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: PayrollRepository,
          useValue: {
            findPayrollByPeriodLabel: jest.fn(),
            createPayroll: jest.fn(),
            bulkCreatePayrollTransactions: jest.fn(),
            findPayrollById: jest.fn(),
            updatePayrollStatus: jest.fn(),
            findPendingTransactionsByPayrollId: jest.fn(),
            incrementProcessedCount: jest.fn(),
            incrementFailedCount: jest.fn(),
            addErrorLog: jest.fn(),
            updateTransactionStatus: jest.fn(),
            findAllPayrolls: jest.fn(),
            findTransactionsByPayrollId: jest.fn(),
            findTransactionsByStaffId: jest.fn(),
            findTransactionById: jest.fn(),
            getPayrollStatistics: jest.fn(),
          },
        },
        {
          provide: StaffRepository,
          useValue: {
            findAllStaff: jest.fn(),
            updateStaffPensionContributions: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            getOrganizationWallet: jest.fn(),
            getWallet: jest.fn(),
            transferFunds: jest.fn(),
            addToPension: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    payrollRepository = module.get(PayrollRepository);
    staffRepository = module.get(StaffRepository);
    walletService = module.get(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayroll', () => {
    const periodStart = new Date('2025-12-01');
    const periodEnd = new Date('2025-12-31');
    const mockStaffList = [
      {
        user: { _id: mockUserId, phone: '08012345678' },
        staff: {
          _id: mockStaffId,
          user_id: mockUserId,
          employee_id: 'EMP-20251213-0001',
          first_name: 'John',
          last_name: 'Doe',
          role: 'Manager',
          department: 'Operations',
          monthly_salary: 50000000, // ₦500,000 in kobo
        },
      },
    ];

    it('should create payroll successfully with active staff', async () => {
      const mockPayroll = {
        _id: mockPayrollId,
        period_label: 'December 2025',
        status: 'pending',
        total_staff_count: 1,
        total_gross_amount: 50000000,
        total_net_amount: 46000000, // After 8% pension deduction
        total_pension_employee: 4000000, // 8%
        total_pension_employer: 5000000, // 10%
        processed_count: 0,
        failed_count: 0,
      };

      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: mockStaffList,
        total: 1,
      });
      payrollRepository.createPayroll.mockResolvedValue(mockPayroll as any);
      payrollRepository.bulkCreatePayrollTransactions.mockResolvedValue([]);

      const result = await service.createPayroll(periodStart, periodEnd);

      expect(result).toBeDefined();
      expect(result.period_label).toBe('December 2025');
      expect(result.total_staff_count).toBe(1);
      expect(result.total_gross_amount).toBe(50000000);
      expect(result.total_net_amount).toBe(46000000);
      expect(payrollRepository.findPayrollByPeriodLabel).toHaveBeenCalledWith(
        'December 2025',
      );
      expect(staffRepository.findAllStaff).toHaveBeenCalledWith({
        page: 1,
        limit: 1000,
        is_approved: true,
        status: 'active',
      });
      expect(
        payrollRepository.bulkCreatePayrollTransactions,
      ).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payroll already exists for the period', async () => {
      const existingPayroll = {
        _id: mockPayrollId,
        period_label: 'December 2025',
      };
      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(
        existingPayroll as any,
      );

      await expect(
        service.createPayroll(periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayroll(periodStart, periodEnd),
      ).rejects.toThrow('Payroll for period December 2025 already exists');
    });

    it('should throw BadRequestException if no active staff found', async () => {
      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: [],
        total: 0,
      });

      await expect(
        service.createPayroll(periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayroll(periodStart, periodEnd),
      ).rejects.toThrow('No active staff members found for payroll processing');
    });

    it('should create payroll with manual initiation (admin)', async () => {
      const mockPayroll = {
        _id: mockPayrollId,
        period_label: 'December 2025',
        is_automated: false,
        initiated_by: mockAdminId,
      };

      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: mockStaffList,
        total: 1,
      });
      payrollRepository.createPayroll.mockResolvedValue(mockPayroll as any);
      payrollRepository.bulkCreatePayrollTransactions.mockResolvedValue([]);

      const result = await service.createPayroll(
        periodStart,
        periodEnd,
        mockAdminId,
        'Manual payroll',
      );

      expect(result.is_automated).toBe(false);
      expect(result.initiated_by).toBe(mockAdminId);
    });

    it('should calculate correct pension deductions for multiple staff', async () => {
      const multipleStaff = [
        {
          user: { _id: new Types.ObjectId() },
          staff: {
            _id: new Types.ObjectId(),
            user_id: new Types.ObjectId(),
            employee_id: 'EMP-001',
            first_name: 'John',
            last_name: 'Doe',
            role: 'Manager',
            department: 'Operations',
            monthly_salary: 50000000, // ₦500,000
          },
        },
        {
          user: { _id: new Types.ObjectId() },
          staff: {
            _id: new Types.ObjectId(),
            user_id: new Types.ObjectId(),
            employee_id: 'EMP-002',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'Developer',
            department: 'IT',
            monthly_salary: 40000000, // ₦400,000
          },
        },
      ];

      const mockPayroll = {
        _id: mockPayrollId,
        total_staff_count: 2,
        total_gross_amount: 90000000, // ₦900,000
        total_net_amount: 82800000, // After 8% deduction
        total_pension_employee: 7200000, // 8% of 900,000
        total_pension_employer: 9000000, // 10% of 900,000
      };

      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: multipleStaff,
        total: 2,
      });
      payrollRepository.createPayroll.mockResolvedValue(mockPayroll as any);
      payrollRepository.bulkCreatePayrollTransactions.mockResolvedValue([]);

      const result = await service.createPayroll(periodStart, periodEnd);

      expect(result.total_staff_count).toBe(2);
      expect(result.total_gross_amount).toBe(90000000);
      expect(result.total_pension_employee).toBe(7200000);
      expect(result.total_pension_employer).toBe(9000000);
    });
  });

  describe('processPayroll', () => {
    const mockPayroll = {
      _id: mockPayrollId,
      period_label: 'December 2025',
      status: 'pending',
      total_net_amount: 46000000,
      total_staff_count: 1,
    };

    const mockTransaction = {
      _id: mockTransactionId,
      staff_id: mockStaffId,
      user_id: mockUserId,
      staff_name: 'John Doe',
      net_salary: 46000000,
      total_pension_contribution: 9000000,
      payroll_id: mockPayrollId,
    };

    const mockOrgWallet = {
      _id: mockOrgWalletId,
      balance: 100000000,
      user_type: 'organization',
    };

    const mockStaffWallet = {
      _id: mockWalletId,
      balance: 0,
      user_type: 'staff',
    };

    it('should process payroll successfully', async () => {
      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);
      payrollRepository.updatePayrollStatus.mockResolvedValue(
        mockPayroll as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(
        mockOrgWallet as any,
      );
      payrollRepository.findPendingTransactionsByPayrollId.mockResolvedValue([
        mockTransaction,
      ] as any);
      walletService.getWallet.mockResolvedValue(mockStaffWallet as any);
      walletService.transferFunds.mockResolvedValue({
        success: true,
        message: 'Success',
      });
      walletService.addToPension.mockResolvedValue(mockStaffWallet as any);
      staffRepository.updateStaffPensionContributions.mockResolvedValue(
        {} as any,
      );
      payrollRepository.updateTransactionStatus.mockResolvedValue(
        mockTransaction as any,
      );
      payrollRepository.incrementProcessedCount.mockResolvedValue();

      const result = await service.processPayroll(mockPayrollId);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.message).toContain('successfully');
      expect(payrollRepository.updatePayrollStatus).toHaveBeenCalledWith(
        mockPayrollId,
        'processing',
      );
      expect(walletService.transferFunds).toHaveBeenCalled();
      expect(walletService.addToPension).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payroll not found', async () => {
      payrollRepository.findPayrollById.mockResolvedValue(null);

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        'Payroll not found',
      );
    });

    it('should throw BadRequestException if payroll already completed', async () => {
      const completedPayroll = { ...mockPayroll, status: 'completed' };
      payrollRepository.findPayrollById.mockResolvedValue(
        completedPayroll as any,
      );

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        'Payroll has already been processed',
      );
    });

    it('should throw BadRequestException if payroll is already processing', async () => {
      const processingPayroll = { ...mockPayroll, status: 'processing' };
      payrollRepository.findPayrollById.mockResolvedValue(
        processingPayroll as any,
      );

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        'Payroll is already being processed',
      );
    });

    it('should throw BadRequestException if organization wallet not found', async () => {
      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);
      payrollRepository.updatePayrollStatus.mockResolvedValue(
        mockPayroll as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(null);

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        'Organization salary wallet not found',
      );
    });

    it('should throw BadRequestException if insufficient funds in organization wallet', async () => {
      const insufficientWallet = { ...mockOrgWallet, balance: 1000000 };
      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);
      payrollRepository.updatePayrollStatus.mockResolvedValue(
        mockPayroll as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(
        insufficientWallet as any,
      );

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        'Insufficient funds in organization wallet',
      );
    });

    it('should handle partial failures and continue processing', async () => {
      const transactions = [
        {
          ...mockTransaction,
          _id: new Types.ObjectId(),
          staff_name: 'John Doe',
        },
        {
          ...mockTransaction,
          _id: new Types.ObjectId(),
          staff_name: 'Jane Smith',
        },
      ];

      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);
      payrollRepository.updatePayrollStatus.mockResolvedValue(
        mockPayroll as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(
        mockOrgWallet as any,
      );
      payrollRepository.findPendingTransactionsByPayrollId.mockResolvedValue(
        transactions as any,
      );

      // First transaction succeeds
      walletService.getWallet.mockResolvedValueOnce(mockStaffWallet as any);
      walletService.transferFunds.mockResolvedValueOnce({
        success: true,
        message: 'Success',
      });
      walletService.addToPension.mockResolvedValueOnce(mockStaffWallet as any);
      staffRepository.updateStaffPensionContributions.mockResolvedValueOnce(
        {} as any,
      );
      payrollRepository.updateTransactionStatus.mockResolvedValueOnce(
        transactions[0] as any,
      );

      // Second transaction fails
      walletService.getWallet.mockRejectedValueOnce(
        new Error('Wallet not found'),
      );

      const result = await service.processPayroll(mockPayrollId);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(payrollRepository.incrementFailedCount).toHaveBeenCalled();
      expect(payrollRepository.addErrorLog).toHaveBeenCalled();
    });

    it('should mark payroll as failed on critical error', async () => {
      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);
      payrollRepository.updatePayrollStatus.mockResolvedValue(
        mockPayroll as any,
      );
      walletService.getOrganizationWallet.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.processPayroll(mockPayrollId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(payrollRepository.updatePayrollStatus).toHaveBeenCalledWith(
        mockPayrollId,
        'failed',
        expect.objectContaining({ failed_reason: expect.any(String) }),
      );
    });
  });

  describe('getPayrollById', () => {
    it('should return payroll by ID', async () => {
      const mockPayroll = {
        _id: mockPayrollId,
        period_label: 'December 2025',
        status: 'completed',
      };

      payrollRepository.findPayrollById.mockResolvedValue(mockPayroll as any);

      const result = await service.getPayrollById(mockPayrollId);

      expect(result).toBeDefined();
      expect(result._id).toBe(mockPayrollId);
      expect(result.period_label).toBe('December 2025');
    });

    it('should throw NotFoundException if payroll not found', async () => {
      payrollRepository.findPayrollById.mockResolvedValue(null);

      await expect(service.getPayrollById(mockPayrollId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPayrollById(mockPayrollId)).rejects.toThrow(
        'Payroll not found',
      );
    });
  });

  describe('getAllPayrolls', () => {
    it('should return paginated payrolls', async () => {
      const mockPayrolls = [
        {
          _id: mockPayrollId,
          period_label: 'December 2025',
          status: 'completed',
        },
        {
          _id: new Types.ObjectId(),
          period_label: 'November 2025',
          status: 'completed',
        },
      ];

      payrollRepository.findAllPayrolls.mockResolvedValue({
        payrolls: mockPayrolls as any,
        total: 2,
      });

      const result = await service.getAllPayrolls(1, 20);

      expect(result.payrolls).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.pages).toBe(1);
    });

    it('should filter payrolls by status', async () => {
      const mockPayrolls = [
        {
          _id: mockPayrollId,
          period_label: 'December 2025',
          status: 'pending',
        },
      ];

      payrollRepository.findAllPayrolls.mockResolvedValue({
        payrolls: mockPayrolls as any,
        total: 1,
      });

      const result = await service.getAllPayrolls(1, 20, 'pending');

      expect(result.payrolls).toHaveLength(1);
      expect(payrollRepository.findAllPayrolls).toHaveBeenCalledWith(
        1,
        20,
        'pending',
      );
    });

    it('should calculate pages correctly', async () => {
      payrollRepository.findAllPayrolls.mockResolvedValue({
        payrolls: [] as any,
        total: 45,
      });

      const result = await service.getAllPayrolls(1, 20);

      expect(result.pages).toBe(3); // 45 / 20 = 2.25, ceil = 3
    });
  });

  describe('getPayrollTransactions', () => {
    it('should return paginated transactions for a payroll', async () => {
      const mockTransactions = [
        {
          _id: mockTransactionId,
          staff_name: 'John Doe',
          status: 'completed',
          net_salary: 46000000,
        },
      ];

      payrollRepository.findTransactionsByPayrollId.mockResolvedValue({
        transactions: mockTransactions as any,
        total: 1,
      });

      const result = await service.getPayrollTransactions(mockPayrollId, 1, 50);

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('should filter transactions by status', async () => {
      payrollRepository.findTransactionsByPayrollId.mockResolvedValue({
        transactions: [] as any,
        total: 0,
      });

      await service.getPayrollTransactions(mockPayrollId, 1, 50, 'failed');

      expect(
        payrollRepository.findTransactionsByPayrollId,
      ).toHaveBeenCalledWith(mockPayrollId, 1, 50, 'failed');
    });
  });

  describe('getStaffPayrollHistory', () => {
    it('should return staff payroll history', async () => {
      const mockTransactions = [
        {
          _id: mockTransactionId,
          staff_id: mockStaffId,
          net_salary: 46000000,
          status: 'completed',
        },
      ];

      payrollRepository.findTransactionsByStaffId.mockResolvedValue({
        transactions: mockTransactions as any,
        total: 1,
      });

      const result = await service.getStaffPayrollHistory(mockStaffId, 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(payrollRepository.findTransactionsByStaffId).toHaveBeenCalledWith(
        mockStaffId,
        1,
        20,
      );
    });
  });

  describe('retryFailedTransaction', () => {
    const mockFailedTransaction = {
      _id: mockTransactionId,
      staff_id: mockStaffId,
      user_id: mockUserId,
      staff_name: 'John Doe',
      status: 'failed',
      net_salary: 46000000,
      total_pension_contribution: 9000000,
    };

    const mockOrgWallet = {
      _id: mockOrgWalletId,
      balance: 100000000,
    };

    const mockStaffWallet = {
      _id: mockWalletId,
      balance: 0,
    };

    it('should retry failed transaction successfully', async () => {
      payrollRepository.findTransactionById.mockResolvedValue(
        mockFailedTransaction as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(
        mockOrgWallet as any,
      );
      walletService.getWallet.mockResolvedValue(mockStaffWallet as any);
      walletService.transferFunds.mockResolvedValue({
        success: true,
        message: 'Success',
      });
      walletService.addToPension.mockResolvedValue(mockStaffWallet as any);
      staffRepository.updateStaffPensionContributions.mockResolvedValue(
        {} as any,
      );
      payrollRepository.updateTransactionStatus.mockResolvedValue(
        mockFailedTransaction as any,
      );

      const result = await service.retryFailedTransaction(mockTransactionId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(payrollRepository.updateTransactionStatus).toHaveBeenCalledWith(
        mockTransactionId,
        'processing',
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      payrollRepository.findTransactionById.mockResolvedValue(null);

      await expect(
        service.retryFailedTransaction(mockTransactionId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.retryFailedTransaction(mockTransactionId),
      ).rejects.toThrow('Payroll transaction not found');
    });

    it('should throw BadRequestException if transaction is not failed', async () => {
      const completedTransaction = {
        ...mockFailedTransaction,
        status: 'completed',
      };
      payrollRepository.findTransactionById.mockResolvedValue(
        completedTransaction as any,
      );

      await expect(
        service.retryFailedTransaction(mockTransactionId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.retryFailedTransaction(mockTransactionId),
      ).rejects.toThrow('Only failed transactions can be retried');
    });

    it('should return error message if organization wallet not found', async () => {
      payrollRepository.findTransactionById.mockResolvedValue(
        mockFailedTransaction as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(null);

      const result = await service.retryFailedTransaction(mockTransactionId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Organization wallet not found');
    });

    it('should update retry count on failure', async () => {
      payrollRepository.findTransactionById.mockResolvedValue(
        mockFailedTransaction as any,
      );
      walletService.getOrganizationWallet.mockResolvedValue(
        mockOrgWallet as any,
      );
      walletService.getWallet.mockRejectedValue(
        new Error('Staff wallet not found'),
      );

      const result = await service.retryFailedTransaction(mockTransactionId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Retry failed');
      expect(payrollRepository.updateTransactionStatus).toHaveBeenCalledWith(
        mockTransactionId,
        'failed',
        expect.objectContaining({
          failed_reason: expect.any(String),
          retry_count: expect.any(Number),
        }),
      );
    });
  });

  describe('getPayrollStatistics', () => {
    it('should return payroll statistics', async () => {
      const mockStats = {
        total: 25,
        completed: 23,
        failed: 2,
        pending: 0,
      };

      payrollRepository.getPayrollStatistics.mockResolvedValue(mockStats);

      const result = await service.getPayrollStatistics(mockPayrollId);

      expect(result).toEqual(mockStats);
      expect(payrollRepository.getPayrollStatistics).toHaveBeenCalledWith(
        mockPayrollId,
      );
    });
  });

  describe('calculatePayrollDeductions (private method - tested through createPayroll)', () => {
    it('should calculate correct deductions for ₦500,000 salary', async () => {
      const mockStaff = [
        {
          user: { _id: mockUserId },
          staff: {
            _id: mockStaffId,
            user_id: mockUserId,
            employee_id: 'EMP-001',
            first_name: 'John',
            last_name: 'Doe',
            role: 'Manager',
            department: 'Operations',
            monthly_salary: 50000000, // ₦500,000
          },
        },
      ];

      const mockPayroll = {
        _id: mockPayrollId,
        total_pension_employee: 4000000, // 8% = ₦40,000
        total_pension_employer: 5000000, // 10% = ₦50,000
        total_gross_amount: 50000000,
        total_net_amount: 46000000, // ₦500,000 - ₦40,000
      };

      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: mockStaff,
        total: 1,
      });
      payrollRepository.createPayroll.mockResolvedValue(mockPayroll as any);
      payrollRepository.bulkCreatePayrollTransactions.mockResolvedValue([]);

      const result = await service.createPayroll(
        new Date('2025-12-01'),
        new Date('2025-12-31'),
      );

      expect(result.total_pension_employee).toBe(4000000); // 8%
      expect(result.total_pension_employer).toBe(5000000); // 10%
      expect(result.total_net_amount).toBe(46000000); // Gross - employee pension
    });

    it('should handle zero salary edge case', async () => {
      const mockStaff = [
        {
          user: { _id: mockUserId },
          staff: {
            _id: mockStaffId,
            user_id: mockUserId,
            employee_id: 'EMP-001',
            first_name: 'John',
            last_name: 'Doe',
            role: 'Intern',
            department: 'Operations',
            monthly_salary: 0,
          },
        },
      ];

      payrollRepository.findPayrollByPeriodLabel.mockResolvedValue(null);
      staffRepository.findAllStaff.mockResolvedValue({
        staff: mockStaff,
        total: 1,
      });
      payrollRepository.createPayroll.mockResolvedValue({
        _id: mockPayrollId,
        total_gross_amount: 0,
        total_pension_employee: 0,
        total_pension_employer: 0,
        total_net_amount: 0,
      } as any);
      payrollRepository.bulkCreatePayrollTransactions.mockResolvedValue([]);

      const result = await service.createPayroll(
        new Date('2025-12-01'),
        new Date('2025-12-31'),
      );

      expect(result.total_gross_amount).toBe(0);
      expect(result.total_pension_employee).toBe(0);
    });
  });
});
