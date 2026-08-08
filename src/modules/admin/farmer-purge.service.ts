import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';
import { SavingsAccount, SavingsAccountDocument } from '../../schemas/savings-account.schema';
import { Transaction, TransactionDocument } from '../../schemas/transaction.schema';
import { Purchase, PurchaseDocument } from '../../schemas/purchase.schema';
import { Loan, LoanDocument } from '../../schemas/loan.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { FarmInputsOrder, FarmInputsOrderDocument } from '../../schemas/farm-inputs-order.schema';
import { Listing, ListingDocument } from '../../schemas/listing.schema';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { SMSLog, SMSLogDocument } from '../../schemas/sms-log.schema';
import { UssdSession, UssdSessionDocument } from '../../schemas/ussd-session.schema';
import { PayoutJobRecord, PayoutJobDocument } from '../../schemas/payout-job.schema';
import { Dispute, DisputeDocument } from '../../schemas/dispute.schema';
import { Report, ReportDocument } from '../../schemas/report.schema';
import { SupplierNetwork, SupplierNetworkDocument } from '../../schemas/supplier-network.schema';

export interface FarmerPurgeResult {
  deleted: true;
  farmerId: string;
  userId: string;
  removed: Record<string, number>;
}

/**
 * Irreversibly removes a farmer's profile, login, and every financial or
 * activity record tied to them (wallet, transactions, purchases, loans,
 * marketplace orders/listings, USSD/SMS history, complaints). Scoped
 * strictly to the one farmer being purged — every other user's data is
 * untouched.
 *
 * There is no "safe to delete" gate here by design: this is a destructive
 * admin action, not a lifecycle cleanup. Callers are expected to gate
 * access (super-admin only) and require explicit confirmation before
 * invoking it.
 */
@Injectable()
export class FarmerPurgeService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Farmer.name) private readonly farmerModel: Model<FarmerDocument>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(SavingsAccount.name) private readonly savingsModel: Model<SavingsAccountDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(FarmInputsOrder.name) private readonly farmInputsOrderModel: Model<FarmInputsOrderDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(SMSLog.name) private readonly smsLogModel: Model<SMSLogDocument>,
    @InjectModel(UssdSession.name) private readonly ussdSessionModel: Model<UssdSessionDocument>,
    @InjectModel(PayoutJobRecord.name) private readonly payoutJobModel: Model<PayoutJobDocument>,
    @InjectModel(Dispute.name) private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(SupplierNetwork.name) private readonly supplierNetworkModel: Model<SupplierNetworkDocument>,
  ) {}

  async purgeFarmer(farmerProfileId: string): Promise<FarmerPurgeResult> {
    if (!Types.ObjectId.isValid(farmerProfileId)) {
      throw new NotFoundException('Farmer was not found.');
    }

    const session = await this.connection.startSession();
    const removed: Record<string, number> = {};
    let userId = '';

    try {
      await session.withTransaction(
        async () => {
          const farmer = await this.farmerModel.findById(farmerProfileId).session(session).exec();
          if (!farmer) {
            throw new NotFoundException('Farmer was not found.');
          }

          const user = await this.userModel.findById(farmer.user_id).session(session).exec();
          if (!user || user.user_type !== 'farmer') {
            throw new NotFoundException('Farmer was not found.');
          }

          const profileId = new Types.ObjectId(String(farmer._id));
          const accountId = new Types.ObjectId(String(user._id));
          userId = accountId.toHexString();
          const phoneVariants = this.phoneVariants(user.phone, user.phone_code);

          const drop = async (label: string, model: Model<any>, filter: Record<string, unknown>) => {
            const result = await model.deleteMany(filter, { session });
            removed[label] = (removed[label] || 0) + result.deletedCount;
          };

          // Financial history: transactions, wallet, savings, payouts.
          await drop('transactions', this.transactionModel, { user_id: accountId });
          await drop('wallets', this.walletModel, { user_id: accountId });
          await drop('savingsAccounts', this.savingsModel, { user_id: accountId });
          await drop('payoutJobs', this.payoutJobModel, { user_id: accountId });

          // Marketplace / credit activity.
          await drop('purchases', this.purchaseModel, { farmerId: profileId.toHexString() });
          await drop('loans', this.loanModel, {
            $or: [{ farmer_id: profileId }, { user_id: accountId }],
          });
          await drop('orders', this.orderModel, { farmer_id: profileId });
          await drop('farmInputsOrders', this.farmInputsOrderModel, { farmer_id: profileId });
          await drop('listings', this.listingModel, { farmer_id: profileId });
          await drop('supplierNetworkLinks', this.supplierNetworkModel, { farmer_id: profileId });

          // Support / communication history.
          await drop('disputes', this.disputeModel, { raised_by: accountId, raised_by_type: 'farmer' });
          await drop('reports', this.reportModel, { reporter_id: accountId, reporter_type: 'farmer' });
          await drop('notifications', this.notificationModel, { user_id: accountId });
          await drop('smsLogs', this.smsLogModel, {
            $or: [{ user_id: accountId }, { recipient_phone: { $in: phoneVariants } }],
          });
          await drop('ussdSessions', this.ussdSessionModel, {
            $or: [{ user_id: accountId.toHexString() }, { phone_number: { $in: phoneVariants } }],
          });

          // Identity last.
          await this.farmerModel.deleteOne({ _id: profileId }, { session });
          await this.userModel.deleteOne({ _id: accountId }, { session });
          removed.identity = 1;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
        },
      );
    } finally {
      await session.endSession();
    }

    return { deleted: true, farmerId: farmerProfileId, userId, removed };
  }

  /** Common local/international representations of a stored phone number. */
  private phoneVariants(phone: string, phoneCode?: string): string[] {
    if (!phone) return [];
    const countryCode = (phoneCode || '234').replace(/\D/g, '') || '234';
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith(countryCode) ? digits.slice(countryCode.length) : digits.replace(/^0/, '');

    if (!local) return [phone];

    return [...new Set([local, `0${local}`, `${countryCode}${local}`, `+${countryCode}${local}`])];
  }
}
