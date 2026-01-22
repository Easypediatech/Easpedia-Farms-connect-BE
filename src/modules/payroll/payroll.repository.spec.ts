import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PayrollRepository } from './payroll.repository';
import { Payroll, PayrollDocument, PayrollTransaction, PayrollTransactionDocument } from '../../schemas';

describe('PayrollRepository', () => {
  let repository: PayrollRepository;
  let payrollModel: jest.Mocked<Model<PayrollDocument>>;
  let payrollTransactionModel: jest.Mocked<Model<PayrollTransactionDocument>>;

  const mockPayrollId = new Types.ObjectId();
  const mockStaffId = new Types.ObjectId();
  const mockTransactionId = new Types.ObjectId();

  const mockExecChain = {
    exec: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollRepository,
        {
          provide: getModelToken(Payroll.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            create: jest.fn(),
            insertMany: jest.fn(),
          },
        },
        {
          provide: getModelToken(PayrollTransaction.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            insertMany: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<PayrollRepository>(PayrollRepository);
    payrollModel = module.get(getModelToken(Payroll.name));
    payrollTransactionModel = module.get(getModelToken(PayrollTransaction.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayroll', () => {
    it('should create a new payroll', async () => {
      const mockPayrollData = {
        period_start: new Date('2025-12-01'),
        period_end: new Date('2025-12-31'),
        period_label: 'December 2025',
        status: 'pending',
        total_staff_count: 25,
      };

      const mockSavedPayroll = {
        ...mockPayrollData,
        _id: mockPayrollId,
        save: jest.fn().mockResolvedValue(mockPayrollData),
      };

      (payrollModel as any) = jest.fn().mockImplementation(() => mockSavedPayroll);
      repository = new PayrollRepository(payrollModel as any, payrollTransactionModel as any);

      const result = await repository.createPayroll(mockPayrollData);

      expect(result).toBeDefined();
      expect(mockSavedPayroll.save).toHaveBeenCalled();
    });
  });

  describe('findPayrollById', () => {
    it('should find payroll by ID', async () => {
      const mockPayroll = { _id: mockPayrollId, period_label: 'December 2025' };
      
      payrollModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayroll),
      } as any);

      const result = await repository.findPayrollById(mockPayrollId);

      expect(result).toEqual(mockPayroll);
      expect(payrollModel.findById).toHaveBeenCalledWith(mockPayrollId);
    });

    it('should return null if payroll not found', async () => {
      payrollModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findPayrollById(mockPayrollId);

      expect(result).toBeNull();
    });
  });

  describe('findPayrollByPeriodLabel', () => {
    it('should find payroll by period label', async () => {
      const mockPayroll = { _id: mockPayrollId, period_label: 'December 2025' };
      
      payrollModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayroll),
      } as any);

      const result = await repository.findPayrollByPeriodLabel('December 2025');

      expect(result).toEqual(mockPayroll);
      expect(payrollModel.findOne).toHaveBeenCalledWith({ period_label: 'December 2025' });
    });

    it('should return null if payroll not found', async () => {
      payrollModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findPayrollByPeriodLabel('January 2026');

      expect(result).toBeNull();
    });
  });

  describe('findAllPayrolls', () => {
    it('should return paginated payrolls', async () => {
      const mockPayrolls = [
        { _id: mockPayrollId, period_label: 'December 2025' },
        { _id: new Types.ObjectId(), period_label: 'November 2025' },
      ];

      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPayrolls),
      };

      payrollModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      } as any);

      const result = await repository.findAllPayrolls(1, 20);

      expect(result.payrolls).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(payrollModel.find).toHaveBeenCalledWith({});
    });

    it('should filter payrolls by status', async () => {
      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      payrollModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await repository.findAllPayrolls(1, 20, 'completed');

      expect(payrollModel.find).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should handle pagination correctly', async () => {
      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      payrollModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await repository.findAllPayrolls(3, 10);

      expect(findChain.skip).toHaveBeenCalledWith(20); // (page 3 - 1) * 10
      expect(findChain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('updatePayrollStatus', () => {
    it('should update payroll status', async () => {
      const mockUpdatedPayroll = {
        _id: mockPayrollId,
        status: 'completed',
        processed_at: new Date(),
      };

      payrollModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedPayroll),
      } as any);

      const result = await repository.updatePayrollStatus(
        mockPayrollId,
        'completed',
        { processed_at: new Date() },
      );

      expect(result).toEqual(mockUpdatedPayroll);
      expect(payrollModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPayrollId,
        expect.objectContaining({
          status: 'completed',
        }),
        { new: true },
      );
    });
  });

  describe('incrementProcessedCount', () => {
    it('should increment processed count', async () => {
      payrollModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await repository.incrementProcessedCount(mockPayrollId);

      expect(payrollModel.findByIdAndUpdate).toHaveBeenCalledWith(mockPayrollId, {
        $inc: { processed_count: 1 },
      });
    });
  });

  describe('incrementFailedCount', () => {
    it('should increment failed count', async () => {
      payrollModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await repository.incrementFailedCount(mockPayrollId);

      expect(payrollModel.findByIdAndUpdate).toHaveBeenCalledWith(mockPayrollId, {
        $inc: { failed_count: 1 },
      });
    });
  });

  describe('addErrorLog', () => {
    it('should add error log to payroll', async () => {
      const errorMessage = 'Payment failed for staff member';
      
      payrollModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      await repository.addErrorLog(mockPayrollId, errorMessage);

      expect(payrollModel.findByIdAndUpdate).toHaveBeenCalledWith(mockPayrollId, {
        $push: { error_logs: errorMessage },
      });
    });
  });

  describe('createPayrollTransaction', () => {
    it('should create a payroll transaction', async () => {
      const mockTransactionData = {
        payroll_id: mockPayrollId,
        staff_id: mockStaffId,
        gross_salary: 50000000,
        net_salary: 46000000,
      };

      const mockSavedTransaction = {
        ...mockTransactionData,
        _id: mockTransactionId,
        save: jest.fn().mockResolvedValue(mockTransactionData),
      };

      (payrollTransactionModel as any) = jest.fn().mockImplementation(() => mockSavedTransaction);
      repository = new PayrollRepository(payrollModel as any, payrollTransactionModel as any);

      const result = await repository.createPayrollTransaction(mockTransactionData);

      expect(result).toBeDefined();
      expect(mockSavedTransaction.save).toHaveBeenCalled();
    });
  });

  describe('bulkCreatePayrollTransactions', () => {
    it('should bulk create payroll transactions', async () => {
      const mockTransactions = [
        { payroll_id: mockPayrollId, staff_id: mockStaffId, net_salary: 46000000 },
        { payroll_id: mockPayrollId, staff_id: new Types.ObjectId(), net_salary: 40000000 },
      ];

      payrollTransactionModel.insertMany = jest.fn().mockResolvedValue(mockTransactions);

      const result = await repository.bulkCreatePayrollTransactions(mockTransactions);

      expect(result).toHaveLength(2);
      expect(payrollTransactionModel.insertMany).toHaveBeenCalledWith(mockTransactions);
    });
  });

  describe('findTransactionById', () => {
    it('should find transaction by ID with populated data', async () => {
      const mockTransaction = {
        _id: mockTransactionId,
        staff_name: 'John Doe',
        net_salary: 46000000,
      };

      const populateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransaction),
      };

      payrollTransactionModel.findById = jest.fn().mockReturnValue(populateChain as any);

      const result = await repository.findTransactionById(mockTransactionId);

      expect(result).toEqual(mockTransaction);
      expect(populateChain.populate).toHaveBeenCalledTimes(2);
    });
  });

  describe('findTransactionsByPayrollId', () => {
    it('should find transactions by payroll ID', async () => {
      const mockTransactions = [
        { _id: mockTransactionId, payroll_id: mockPayrollId, net_salary: 46000000 },
      ];

      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions),
      };

      payrollTransactionModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollTransactionModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      } as any);

      const result = await repository.findTransactionsByPayrollId(mockPayrollId, 1, 50);

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(payrollTransactionModel.find).toHaveBeenCalledWith({ payroll_id: mockPayrollId });
    });

    it('should filter transactions by status', async () => {
      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      payrollTransactionModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollTransactionModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await repository.findTransactionsByPayrollId(mockPayrollId, 1, 50, 'failed');

      expect(payrollTransactionModel.find).toHaveBeenCalledWith({
        payroll_id: mockPayrollId,
        status: 'failed',
      });
    });
  });

  describe('findTransactionsByStaffId', () => {
    it('should find transactions by staff ID', async () => {
      const mockTransactions = [
        { _id: mockTransactionId, staff_id: mockStaffId, net_salary: 46000000 },
      ];

      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions),
      };

      payrollTransactionModel.find = jest.fn().mockReturnValue(findChain as any);
      payrollTransactionModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      } as any);

      const result = await repository.findTransactionsByStaffId(mockStaffId, 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(payrollTransactionModel.find).toHaveBeenCalledWith({ staff_id: mockStaffId });
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const mockUpdatedTransaction = {
        _id: mockTransactionId,
        status: 'completed',
        paid_at: new Date(),
      };

      payrollTransactionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedTransaction),
      } as any);

      const result = await repository.updateTransactionStatus(
        mockTransactionId,
        'completed',
        { paid_at: new Date() },
      );

      expect(result).toEqual(mockUpdatedTransaction);
      expect(payrollTransactionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          status: 'completed',
        }),
        { new: true },
      );
    });
  });

  describe('findPendingTransactionsByPayrollId', () => {
    it('should find pending transactions', async () => {
      const mockTransactions = [
        { _id: mockTransactionId, status: 'pending', payroll_id: mockPayrollId },
      ];

      const findChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTransactions),
      };

      payrollTransactionModel.find = jest.fn().mockReturnValue(findChain as any);

      const result = await repository.findPendingTransactionsByPayrollId(mockPayrollId);

      expect(result).toHaveLength(1);
      expect(payrollTransactionModel.find).toHaveBeenCalledWith({
        payroll_id: mockPayrollId,
        status: 'pending',
      });
    });
  });

  describe('getPayrollStatistics', () => {
    it('should return payroll statistics', async () => {
      const countChain = { exec: jest.fn() };
      
      payrollTransactionModel.countDocuments = jest.fn()
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(25) })  // total
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(22) })  // completed
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(2) })   // failed
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(1) });  // pending

      const result = await repository.getPayrollStatistics(mockPayrollId);

      expect(result).toEqual({
        total: 25,
        completed: 22,
        failed: 2,
        pending: 1,
      });
      expect(payrollTransactionModel.countDocuments).toHaveBeenCalledTimes(4);
    });

    it('should handle zero transactions', async () => {
      payrollTransactionModel.countDocuments = jest.fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      const result = await repository.getPayrollStatistics(mockPayrollId);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
      });
    });
  });
});
