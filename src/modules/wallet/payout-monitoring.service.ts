import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import {
  PayoutJobDocument,
  PayoutJobRecord,
} from '../../schemas/payout-job.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';

export interface PayoutListFilter {
  page?: number;
  limit?: number;
  status?:
    | 'pending'
    | 'processing'
    | 'retrying'
    | 'completed'
    | 'failed'
    | 'manual_review'
    | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status' | 'processed_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Read-only view over payout jobs for the admin "Withdrawers" screen.
 *
 * This intentionally stops at reporting: it does not enqueue, retry, or
 * settle payouts. Whatever writes to the payout-jobs collection (the
 * wallet withdrawal flow) owns that lifecycle; this service only turns
 * what's already there into list/summary/detail views for admins.
 */
@Injectable()
export class PayoutMonitoringService {
  constructor(
    @InjectModel(PayoutJobRecord.name)
    private readonly payoutJobs: Model<PayoutJobDocument>,
    @InjectModel(Transaction.name)
    private readonly transactions: Model<TransactionDocument>,
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,
    @InjectModel(Farmer.name)
    private readonly farmers: Model<FarmerDocument>,
    @InjectModel(Staff.name)
    private readonly staffRecords: Model<StaffDocument>,
  ) {}

  /**
   * Builds a Mongo `createdAt` range filter from optional ISO date
   * strings, shared by both the summary and list queries below.
   */
  private buildDateRangeFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return {};
    }

    const range: Record<string, Date> = {};
    if (startDate) {
      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate');
      }
      range.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate');
      }
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }

    return { createdAt: range };
  }

  async summarizePayouts(range: { startDate?: string; endDate?: string }) {
    const filter = this.buildDateRangeFilter(range.startDate, range.endDate);
    const byStatus = (status: string) => ({ ...filter, status });
    const sumOf = (match: Record<string, unknown>) =>
      this.payoutJobs.aggregate([
        { $match: match },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, averageAmount: { $avg: '$amount' } } },
      ]);

    const [
      totalRequests,
      pending,
      processing,
      retrying,
      completed,
      failed,
      overallAmounts,
      completedAmounts,
      failedAmounts,
    ] = await Promise.all([
      this.payoutJobs.countDocuments(filter),
      this.payoutJobs.countDocuments(byStatus('pending')),
      this.payoutJobs.countDocuments(byStatus('processing')),
      this.payoutJobs.countDocuments(byStatus('retrying')),
      this.payoutJobs.countDocuments(byStatus('completed')),
      this.payoutJobs.countDocuments(byStatus('failed')),
      sumOf(filter),
      sumOf(byStatus('completed')),
      sumOf(byStatus('failed')),
    ]);

    const toNaira = (kobo: number | undefined) => Number(((kobo || 0) / 100).toFixed(2));

    return {
      period: {
        startDate: range.startDate || null,
        endDate: range.endDate || null,
      },
      totals: {
        totalRequests,
        pending,
        processing,
        retrying,
        completed,
        failed,
        totalRequestedAmount: toNaira(overallAmounts[0]?.totalAmount),
        totalCompletedAmount: toNaira(completedAmounts[0]?.totalAmount),
        totalFailedAmount: toNaira(failedAmounts[0]?.totalAmount),
        averageAmount: toNaira(overallAmounts[0]?.averageAmount),
      },
    };
  }

  async listPayouts(filter: PayoutListFilter): Promise<{
    payouts: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      ...this.buildDateRangeFilter(filter.startDate, filter.endDate),
    };

    if (filter.status && filter.status !== 'all') {
      query.status = filter.status;
    }

    const trimmedSearch = filter.search?.trim();
    if (trimmedSearch) {
      const pattern = new RegExp(trimmedSearch, 'i');
      query.$or = [
        { wallet_transaction_reference: pattern },
        { transfer_reference: pattern },
        { user_name: pattern },
        { user_phone: pattern },
        { account_number: pattern },
        { account_name: pattern },
      ];
    }

    const sortField = filter.sortBy || 'createdAt';
    const sortDirection = filter.sortOrder === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      this.payoutJobs
        .find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.payoutJobs.countDocuments(query),
    ]);

    const payouts = await Promise.all(records.map((record) => this.toPayoutView(record)));

    return {
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPayoutDetail(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid withdrawal payout id');
    }

    const record = await this.payoutJobs.findById(id).lean().exec();
    if (!record) {
      throw new NotFoundException('Withdrawal payout record not found');
    }

    return this.toPayoutView(record, { withLedgerLegs: true });
  }

  private async toPayoutView(
    record: any,
    options: { withLedgerLegs?: boolean } = {},
  ) {
    const beneficiary = await this.lookupBeneficiary(
      record.user_id?.toString?.() || '',
      record.user_type,
      record.user_name,
      record.user_phone,
    );

    const toNaira = (kobo: number | undefined) => Number(((kobo || 0) / 100).toFixed(2));

    const view: any = {
      id: record._id.toString(),
      walletTransactionId: record.wallet_transaction_id?.toString?.(),
      walletTransactionReference: record.wallet_transaction_reference,
      transferReference: record.transfer_reference,
      payoutProvider: record.payout_provider || null,
      providerStatus: record.provider_status || null,
      providerResponseCode: record.provider_response_code || null,
      providerReference: record.provider_reference || null,
      providerPaymentId: record.provider_payment_id || null,
      providerRequestRef: record.provider_request_ref || null,
      paystackTransferCode: record.paystack_transfer_code || null,
      paystackRecipientCode: record.paystack_recipient_code || null,
      userId: record.user_id?.toString?.(),
      userType: record.user_type,
      userName: beneficiary.name,
      userPhone: beneficiary.phone,
      source: record.source,
      amount: toNaira(record.amount),
      status: record.status,
      attempts: record.attempts || 0,
      maxAttempts: record.max_attempts || 5,
      lastError: record.last_error || null,
      nextRetryAt: record.next_retry_at || null,
      bank: {
        name: record.bank_name,
        code: record.bank_code,
        accountNumber: record.account_number,
        accountName: record.account_name,
      },
      balances: {
        userWalletBefore: toNaira(record.user_wallet_balance_before),
        userWalletAfter: toNaira(record.user_wallet_balance_after),
        organizationWithdrawerWalletBefore: toNaira(record.organization_wallet_balance_before),
        organizationWithdrawerWalletAfter: toNaira(record.organization_wallet_balance_after),
      },
      organizationWalletTransactionId:
        record.organization_wallet_transaction_id?.toString?.() || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      processedAt: record.processed_at || null,
      failedAt: record.failed_at || null,
    };

    if (options.withLedgerLegs) {
      const [userLeg, organizationLeg] = await Promise.all([
        this.transactions.findById(record.wallet_transaction_id).lean(),
        record.organization_wallet_transaction_id
          ? this.transactions.findById(record.organization_wallet_transaction_id).lean()
          : Promise.resolve(null),
      ]);

      view.transactions = {
        userWalletTransaction: userLeg ? this.toTransactionView(userLeg) : null,
        organizationWithdrawerTransaction: organizationLeg
          ? this.toTransactionView(organizationLeg)
          : null,
      };
    }

    return view;
  }

  private toTransactionView(transaction: any) {
    const toNaira = (kobo: number | undefined) => Number(((kobo || 0) / 100).toFixed(2));
    return {
      id: transaction._id?.toString?.(),
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      amount: toNaira(transaction.amount),
      balanceBefore: toNaira(transaction.balance_before),
      balanceAfter: toNaira(transaction.balance_after),
      description: transaction.description || '',
      metadata: transaction.metadata || {},
      createdAt: transaction.createdAt,
      completedAt: transaction.completed_at || null,
      failedAt: transaction.failed_at || null,
    };
  }

  /**
   * Best-effort display name/phone for whoever received the payout.
   * Falls back to whatever was snapshotted on the job record at
   * creation time if the live profile lookup comes up empty.
   */
  private async lookupBeneficiary(
    userId: string,
    userType: 'farmer' | 'staff',
    snapshotName?: string,
    snapshotPhone?: string,
  ): Promise<{ name: string; phone: string | null }> {
    const account = userId
      ? await this.users.findById(userId).select('phone').lean()
      : null;
    const phone = account?.phone || snapshotPhone || null;

    if (userType === 'staff') {
      const staffRecord = userId
        ? await this.staffRecords
            .findOne({ user_id: new Types.ObjectId(userId) })
            .select('first_name last_name')
            .lean()
        : null;
      const name =
        (staffRecord ? `${staffRecord.first_name || ''} ${staffRecord.last_name || ''}`.trim() : '') ||
        snapshotName ||
        'STAFF';
      return { name: name.toUpperCase(), phone };
    }

    const farmerRecord = userId
      ? await this.farmers
          .findOne({ user_id: new Types.ObjectId(userId) })
          .select('first_name last_name')
          .lean()
      : null;
    const name =
      (farmerRecord ? `${farmerRecord.first_name || ''} ${farmerRecord.last_name || ''}`.trim() : '') ||
      snapshotName ||
      'FARMER';
    return { name: name.toUpperCase(), phone };
  }
}
