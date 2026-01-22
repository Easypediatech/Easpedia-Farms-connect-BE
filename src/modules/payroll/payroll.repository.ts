import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payroll,
  PayrollDocument,
  PayrollTransaction,
  PayrollTransactionDocument,
} from '../../schemas';

@Injectable()
export class PayrollRepository {
  constructor(
    @InjectModel(Payroll.name)
    private payrollModel: Model<PayrollDocument>,
    @InjectModel(PayrollTransaction.name)
    private payrollTransactionModel: Model<PayrollTransactionDocument>,
  ) {}

  // ==================== Payroll Operations ====================

  async createPayroll(payrollData: Partial<Payroll>): Promise<PayrollDocument> {
    const payroll = new this.payrollModel(payrollData);
    return payroll.save();
  }

  async findPayrollById(
    payrollId: string | Types.ObjectId,
  ): Promise<PayrollDocument | null> {
    return this.payrollModel.findById(payrollId).exec();
  }

  async findPayrollByPeriodLabel(
    periodLabel: string,
  ): Promise<PayrollDocument | null> {
    return this.payrollModel.findOne({ period_label: periodLabel }).exec();
  }

  async findAllPayrolls(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{ payrolls: PayrollDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = status ? { status } : {};

    const [payrolls, total] = await Promise.all([
      this.payrollModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('initiated_by', 'first_name last_name email')
        .exec(),
      this.payrollModel.countDocuments(query).exec(),
    ]);

    return { payrolls, total };
  }

  async updatePayrollStatus(
    payrollId: string | Types.ObjectId,
    status: string,
    updateData?: Partial<Payroll>,
  ): Promise<PayrollDocument | null> {
    return this.payrollModel
      .findByIdAndUpdate(
        payrollId,
        {
          status,
          ...updateData,
        },
        { new: true },
      )
      .exec();
  }

  async incrementProcessedCount(
    payrollId: string | Types.ObjectId,
  ): Promise<void> {
    await this.payrollModel
      .findByIdAndUpdate(payrollId, {
        $inc: { processed_count: 1 },
      })
      .exec();
  }

  async incrementFailedCount(
    payrollId: string | Types.ObjectId,
  ): Promise<void> {
    await this.payrollModel
      .findByIdAndUpdate(payrollId, {
        $inc: { failed_count: 1 },
      })
      .exec();
  }

  async addErrorLog(
    payrollId: string | Types.ObjectId,
    errorMessage: string,
  ): Promise<void> {
    await this.payrollModel
      .findByIdAndUpdate(payrollId, {
        $push: { error_logs: errorMessage },
      })
      .exec();
  }

  // ==================== Payroll Transaction Operations ====================

  async createPayrollTransaction(
    transactionData: Partial<PayrollTransaction>,
  ): Promise<PayrollTransactionDocument> {
    const transaction = new this.payrollTransactionModel(transactionData);
    return transaction.save();
  }

  async bulkCreatePayrollTransactions(transactions: any[]): Promise<any[]> {
    return this.payrollTransactionModel.insertMany(transactions);
  }

  async findTransactionById(
    transactionId: string | Types.ObjectId,
  ): Promise<PayrollTransactionDocument | null> {
    return this.payrollTransactionModel
      .findById(transactionId)
      .populate('staff_id', 'first_name last_name employee_id role department')
      .populate('payroll_id')
      .exec();
  }

  async findTransactionsByPayrollId(
    payrollId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<{ transactions: PayrollTransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = { payroll_id: payrollId };
    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.payrollTransactionModel
        .find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'staff_id',
          'first_name last_name employee_id role department',
        )
        .exec(),
      this.payrollTransactionModel.countDocuments(query).exec(),
    ]);

    return { transactions, total };
  }

  async findAllTransactions(
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<{ transactions: PayrollTransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {};
    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.payrollTransactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('staff_id', 'first_name last_name employee_id role department')
        .populate('payroll_id', 'period_label period_start period_end')
        .exec(),
      this.payrollTransactionModel.countDocuments(query).exec(),
    ]);

    return { transactions, total };
  }

  async findTransactionsByStaffId(
    staffId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: PayrollTransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.payrollTransactionModel
        .find({ staff_id: staffId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('payroll_id')
        .exec(),
      this.payrollTransactionModel.countDocuments({ staff_id: staffId }).exec(),
    ]);

    return { transactions, total };
  }

  async findAllPayrollTransactions(
    page: number = 1,
    limit: number = 50,
    status?: string,
    staffId?: string | Types.ObjectId,
    payrollId?: string | Types.ObjectId,
  ): Promise<{ transactions: PayrollTransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (staffId) {
      query.staff_id = staffId;
    }

    if (payrollId) {
      query.payroll_id = payrollId;
    }

    const [transactions, total] = await Promise.all([
      this.payrollTransactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('payroll_id', 'period_label status')
        .populate(
          'staff_id',
          'first_name last_name employee_id role department',
        )
        .exec(),
      this.payrollTransactionModel.countDocuments(query).exec(),
    ]);

    return { transactions, total };
  }

  async updateTransactionStatus(
    transactionId: string | Types.ObjectId,
    status: string,
    updateData?: Partial<PayrollTransaction>,
  ): Promise<PayrollTransactionDocument | null> {
    return this.payrollTransactionModel
      .findByIdAndUpdate(
        transactionId,
        {
          status,
          ...updateData,
        },
        { new: true },
      )
      .exec();
  }

  async findPendingTransactionsByPayrollId(
    payrollId: string | Types.ObjectId,
  ): Promise<PayrollTransactionDocument[]> {
    return this.payrollTransactionModel
      .find({
        payroll_id: payrollId,
        status: 'pending',
      })
      .populate('staff_id')
      .exec();
  }

  async getPayrollStatistics(payrollId: string | Types.ObjectId): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    const [total, completed, failed, pending] = await Promise.all([
      this.payrollTransactionModel
        .countDocuments({ payroll_id: payrollId })
        .exec(),
      this.payrollTransactionModel
        .countDocuments({ payroll_id: payrollId, status: 'completed' })
        .exec(),
      this.payrollTransactionModel
        .countDocuments({ payroll_id: payrollId, status: 'failed' })
        .exec(),
      this.payrollTransactionModel
        .countDocuments({ payroll_id: payrollId, status: 'pending' })
        .exec(),
    ]);

    return { total, completed, failed, pending };
  }
}
