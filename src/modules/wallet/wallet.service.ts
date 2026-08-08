import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { WalletRepository } from './wallet.repository';
import { WalletDocument } from '../../schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../../schemas/transaction.schema';
import { PaystackService } from './paystack.service';

/**
 * Display names for the org-level pooled wallets (as opposed to a
 * farmer/staff personal wallet). Each entry here corresponds to one
 * named Wallet document with is_organization_wallet-style lookup by name.
 */
export const ORG_WALLET_LABELS = {
  payroll: 'Organization Payroll Wallet',
  bonus: 'Organization Bonus Wallet',
  withdrawer: 'Organization Withdrawer Wallet',
  purchase: 'Organization Purchase Wallet',
  withholding_tax: 'Organization Withholding Tax Wallet',
  charges: 'Organization Charges Wallet',
} as const;

export type OrgWalletKind = keyof typeof ORG_WALLET_LABELS;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly paystackService: PaystackService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Create a new wallet for a user
   *
   * @param userId - User's ObjectId
   * @param userType - Type of user ('farmer', 'buyer', or 'staff')
   * @returns Created wallet
   */
  async createWallet(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    userType: 'farmer' | 'buyer' | 'staff',
  ): Promise<WalletDocument> {
    this.logger.log(`Creating wallet for ${userType}: ${userId.toString()}`);

    // Check if wallet already exists
    const existingWallet = await this.walletRepository.findByUserId(userId);
    if (existingWallet) {
      this.logger.warn(`Wallet already exists for user: ${userId.toString()}`);
      return existingWallet;
    }

    return this.walletRepository.createWallet(userId, userType);
  }

  /**
   * Get wallet by user ID
   *
   * @param userId - User's ObjectId
   * @returns Wallet
   * @throws NotFoundException if wallet not found
   */
  async getWallet(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
  ): Promise<WalletDocument> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException(
        `Wallet not found for user: ${userId.toString()}`,
      );
    }

    return wallet;
  }

  /**
   * Get wallet balance
   *
   * @param userId - User's ObjectId
   * @returns Balance details
   */
  async getBalance(userId: MongooseSchema.Types.ObjectId): Promise<{
    balance: number;
    escrow_balance: number;
    savings_balance: number;
    total_earned: number;
    total_spent: number;
    total_withdrawn: number;
    total_deposited: number;
  }> {
    const wallet = await this.getWallet(userId);

    return {
      balance: wallet.balance,
      escrow_balance: wallet.escrow_balance,
      savings_balance: wallet.savings_balance,
      total_earned: wallet.total_earned,
      total_spent: wallet.total_spent,
      total_withdrawn: wallet.total_withdrawn,
      total_deposited: wallet.total_deposited,
    };
  }

  /**
   * Credit wallet (add funds)
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async creditWallet(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Crediting wallet ${userId.toString()} with ${amount} kobo`,
    );
    return this.walletRepository.updateBalance(userId, amount, 'credit');
  }

  /**
   * Debit wallet (remove funds)
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   * @throws Error if insufficient balance
   */
  async debitWallet(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(`Debiting wallet ${userId.toString()} with ${amount} kobo`);
    return this.walletRepository.updateBalance(userId, amount, 'debit');
  }

  /**
   * Lock funds in escrow
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async lockInEscrow(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Locking ${amount} kobo in escrow for user ${userId.toString()}`,
    );
    return this.walletRepository.addToEscrow(userId, amount);
  }

  /**
   * Release funds from escrow
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @param toBalance - Whether to add to balance or not
   * @returns Updated wallet
   */
  async releaseFromEscrow(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
    toBalance: boolean = true,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Releasing ${amount} kobo from escrow for user ${userId.toString()}`,
    );
    return this.walletRepository.releaseFromEscrow(userId, amount, toBalance);
  }

  /**
   * Deposit to savings
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async depositToSavings(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Depositing ${amount} kobo to savings for user ${userId.toString()}`,
    );
    return this.walletRepository.updateSavings(userId, amount, 'deposit');
  }

  /**
   * Withdraw from savings
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async withdrawFromSavings(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Withdrawing ${amount} kobo from savings for user ${userId.toString()}`,
    );
    return this.walletRepository.updateSavings(userId, amount, 'withdrawal');
  }

  /**
   * Update bank details
   *
   * @param userId - User's ObjectId
   * @param bankDetails - Bank account details
   * @returns Updated wallet
   */
  async updateBankDetails(
    userId: MongooseSchema.Types.ObjectId,
    bankDetails: {
      bank_name: string;
      account_number: string;
      account_name: string;
      bvn?: string;
    },
  ): Promise<WalletDocument | null> {
    this.logger.log(`Updating bank details for user ${String(userId)}`);
    return this.walletRepository.updateBankDetails(userId, bankDetails);
  }

  /**
   * Calculate daily savings interest (8% per annum)
   * Should be run by a cron job daily
   *
   * @param userId - User's ObjectId
   * @returns Updated wallet
   */
  async calculateDailyInterest(
    userId: MongooseSchema.Types.ObjectId,
  ): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId);

    if (wallet.savings_balance <= 0) {
      return wallet;
    }

    // Daily interest = (balance * annual_rate) / 365
    const annualRate = 0.08; // 8% per annum
    const dailyInterest = Math.round(
      (wallet.savings_balance * annualRate) / 365,
    );

    this.logger.log(
      `Adding ${dailyInterest} kobo interest to savings for user ${userId.toString()}`,
    );

    wallet.savings_balance += dailyInterest;
    return wallet.save();
  }

  /**
   * Withdraw funds from wallet
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @param bankDetails - Optional bank details for withdrawal
   * @returns Updated wallet
   */
  async withdrawFromWallet(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
    bankDetails?: {
      bank_name: string;
      bank_code: string;
      account_number: string;
      account_name: string;
    },
  ): Promise<WalletDocument> {
    this.logger.log(
      `Processing withdrawal of ${amount} kobo for user ${userId.toString()}`,
    );

    const wallet = await this.getWallet(userId);

    // Validate sufficient balance
    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₦${wallet.balance / 100}, Required: ₦${amount / 100}`,
      );
    }

    // Verify account if bank details provided
    if (bankDetails) {
      try {
        const verifiedAccount = await this.paystackService.verifyAccountNumber(
          bankDetails.account_number,
          bankDetails.bank_code,
        );

        this.logger.log(`Account verified: ${verifiedAccount.account_name}`);

        // Use verified name if not a mock response
        if (verifiedAccount.account_name !== 'TEST ACCOUNT HOLDER') {
          bankDetails.account_name = verifiedAccount.account_name;
        }
      } catch (error) {
        this.logger.error(
          `Account verification failed: ${(error as Error).message}`,
        );

        // Allow withdrawal to proceed if it's just a rate limit issue
        if (
          !(error as Error).message.includes('rate limit') &&
          !(error as Error).message.includes('daily limit')
        ) {
          throw new BadRequestException(
            'Failed to verify bank account. Please check account details.',
          );
        }

        this.logger.warn(
          'Proceeding with withdrawal despite verification failure (rate limit)',
        );
      }
    } else if (!wallet.account_number) {
      throw new BadRequestException(
        'No withdrawal account set. Please provide bank details.',
      );
    }

    // Deduct from wallet
    wallet.balance -= amount;
    wallet.total_withdrawn += amount;

    // Save bank details if provided
    if (bankDetails) {
      wallet.bank_name = bankDetails.bank_name;
      wallet.account_number = bankDetails.account_number;
      wallet.account_name = bankDetails.account_name;
    }

    await wallet.save();

    this.logger.log(
      `Withdrawal processed successfully for user ${userId.toString()}`,
    );

    // TODO: Integrate with payment gateway for actual transfer
    // For now, we're just updating the wallet balance

    return wallet;
  }

  /**
   * Set withdrawal account for user
   *
   * @param userId - User's ObjectId
   * @param bankDetails - Bank account details
   * @returns Updated wallet
   */
  async setWithdrawalAccount(
    userId: MongooseSchema.Types.ObjectId,
    bankDetails: {
      bank_name: string;
      bank_code: string;
      account_number: string;
      account_name: string;
      bvn?: string;
    },
  ): Promise<WalletDocument> {
    this.logger.log(`Setting withdrawal account for user ${userId.toString()}`);

    // Verify account with Paystack
    try {
      const verifiedAccount = await this.paystackService.verifyAccountNumber(
        bankDetails.account_number,
        bankDetails.bank_code,
      );

      this.logger.log(`Account verified: ${verifiedAccount.account_name}`);

      // Use verified name if not a mock response, otherwise use provided name
      const accountName =
        verifiedAccount.account_name === 'TEST ACCOUNT HOLDER'
          ? bankDetails.account_name
          : verifiedAccount.account_name;

      // Update wallet with verified details
      const updatedWallet = await this.updateBankDetails(userId, {
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        account_name: accountName,
        bvn: bankDetails.bvn,
      });

      if (!updatedWallet) {
        throw new NotFoundException(
          `Wallet not found for user: ${userId.toString()}`,
        );
      }

      return updatedWallet;
    } catch (error) {
      this.logger.error(
        `Account verification failed: ${(error as Error).message}`,
      );

      // If it's a verification issue but account format is valid, allow saving in test mode
      if (
        (error as Error).message.includes('rate limit') ||
        (error as Error).message.includes('daily limit')
      ) {
        this.logger.warn(
          'Saving account without full verification due to rate limits',
        );

        const updatedWallet = await this.updateBankDetails(userId, {
          bank_name: bankDetails.bank_name,
          account_number: bankDetails.account_number,
          account_name: bankDetails.account_name,
          bvn: bankDetails.bvn,
        });

        if (!updatedWallet) {
          throw new NotFoundException(
            `Wallet not found for user: ${userId.toString()}`,
          );
        }

        return updatedWallet;
      }

      throw new BadRequestException(
        'Failed to verify bank account. Please check account details.',
      );
    }
  }

  /**
   * Admin fund user wallet
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @param reason - Reason for funding
   * @returns Updated wallet
   */
  async adminFundWallet(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
    reason: string,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Admin funding wallet ${userId.toString()} with ${amount} kobo. Reason: ${reason}`,
    );

    const wallet = await this.creditWallet(userId, amount);
    wallet.total_deposited += amount;
    await wallet.save();

    return wallet;
  }

  /**
   * Admin fund organization wallet
   *
   * @param amount - Amount in kobo
   * @param reason - Reason for funding
   * @returns Updated organization wallet
   */
  async fundOrganizationWallet(
    amount: number,
    reason?: string,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Admin funding organization wallet with ${amount} kobo. Reason: ${reason || 'Not specified'}`,
    );

    let wallet = await this.getOrganizationWallet();
    if (!wallet) {
      this.logger.log('Organization payroll wallet not found, creating one...');
      wallet = await this.createOrganizationWallet('Organization Payroll Wallet');
      this.logger.log('Organization payroll wallet created successfully');
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.total_deposited += amount;
    await wallet.save();

    // Create a transaction record for the funding
    try {
      const transactionReference = `ORG_FUND_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await this.transactionModel.create({
        user_id: wallet._id, // Use wallet ID as reference
        user_type: 'organization',
        type: 'organization_funding',
        amount: amount,
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        status: 'completed',
        reference: transactionReference,
        description: reason || 'Organization wallet funding',
        completed_at: new Date(),
      });

      this.logger.log(`Organization funding transaction created: ${transactionReference}`);
    } catch (error) {
      this.logger.error(`Failed to create organization funding transaction: ${error.message}`);
      // Don't throw - the wallet was already funded successfully
    }

    this.logger.log(
      `Organization wallet funded successfully. New balance: ₦${(wallet.balance / 100).toFixed(2)}`,
    );

    return wallet;
  }

  /**
   * Add funds to pension wallet (staff only)
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async addToPension(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Adding ${amount} kobo to pension wallet for user ${userId.toString()}`,
    );

    const wallet = await this.getWallet(userId);

    if (wallet.user_type !== 'staff') {
      throw new BadRequestException(
        'Pension wallet is only available for staff',
      );
    }

    wallet.pension_balance += amount;
    await wallet.save();

    return wallet;
  }

  /**
   * Get pension balance (staff only)
   *
   * @param userId - User's ObjectId
   * @returns Pension balance
   */
  async getPensionBalance(
    userId: MongooseSchema.Types.ObjectId,
  ): Promise<number> {
    const wallet = await this.getWallet(userId);

    if (wallet.user_type !== 'staff') {
      throw new BadRequestException(
        'Pension wallet is only available for staff',
      );
    }

    return wallet.pension_balance;
  }

  /**
   * Withdraw from pension wallet (staff only)
   * Can only be withdrawn under certain conditions
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async withdrawFromPension(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Withdrawing ${amount} kobo from pension wallet for user ${userId.toString()}`,
    );

    const wallet = await this.getWallet(userId);

    if (wallet.user_type !== 'staff') {
      throw new BadRequestException(
        'Pension wallet is only available for staff',
      );
    }

    if (wallet.pension_balance < amount) {
      throw new BadRequestException(
        `Insufficient pension balance. Available: ₦${wallet.pension_balance / 100}`,
      );
    }

    wallet.pension_balance -= amount;
    await wallet.save();

    return wallet;
  }

  /**
   * Get or create organization wallet (salary wallet)
   * Used to fund staff salaries
   *
   * @returns Organization wallet
   */
  async getOrganizationWallet(): Promise<WalletDocument | null> {
    return this.walletRepository.findOrganizationWallet('Organization Payroll Wallet');
  }

  /**
   * Create organization wallet
   *
   * @param organizationName - Name of the organization
   * @returns Created wallet
   */
  async createOrganizationWallet(
    organizationName: string,
  ): Promise<WalletDocument> {
    this.logger.log(`Creating organization wallet for: ${organizationName}`);

    // Check if organization wallet with this name already exists
    const existing = await this.walletRepository.findOrganizationWallet(organizationName);
    if (existing) {
      this.logger.warn(`Organization wallet '${organizationName}' already exists`);
      return existing;
    }

    return this.walletRepository.createOrganizationWallet(organizationName);
  }

  private labelForOrgWalletKind(kind: string): string {
    const normalizedKind = (kind || '').trim().toLowerCase() as OrgWalletKind;
    const label = ORG_WALLET_LABELS[normalizedKind];
    if (!label) {
      throw new BadRequestException(`Unrecognized organization wallet kind: ${kind}`);
    }
    return label;
  }

  /**
   * Look up (and optionally lazily create) the pooled organization wallet
   * for a given kind, e.g. 'payroll' or 'withdrawer'.
   */
  async findOrgWalletByKind(
    kind: string,
    createIfMissing = false,
  ): Promise<WalletDocument | null> {
    const label = this.labelForOrgWalletKind(kind);
    const existing = await this.walletRepository.findOrganizationWallet(label);
    if (existing || !createIfMissing) {
      return existing;
    }
    return this.walletRepository.createOrganizationWallet(label);
  }

  /**
   * Snapshot every pooled organization wallet kind in one call, keyed by
   * kind so callers can build KPI/summary views without N sequential lookups.
   */
  async listAllOrgWallets(): Promise<Record<OrgWalletKind, WalletDocument | null>> {
    const kinds = Object.keys(ORG_WALLET_LABELS) as OrgWalletKind[];
    const lookups = await Promise.all(
      kinds.map((kind) => this.findOrgWalletByKind(kind)),
    );

    return kinds.reduce(
      (result, kind, index) => {
        result[kind] = lookups[index];
        return result;
      },
      {} as Record<OrgWalletKind, WalletDocument | null>,
    );
  }

  /**
   * Get or create organization bonus wallet
   * Used to fund staff bonuses
   *
   * @returns Organization bonus wallet
   */
  async getOrganizationBonusWallet(): Promise<WalletDocument> {
    const wallet = await this.walletRepository.findOrganizationWallet('Organization Bonus Wallet');

    if (wallet) {
      return wallet;
    }

    return this.walletRepository.createOrganizationWallet('Organization Bonus Wallet');
  }

  /**
   * Create organization bonus wallet
   *
   * @param organizationName - Name of the organization
   * @returns Created wallet
   */
  async createOrganizationBonusWallet(
    organizationName: string,
  ): Promise<WalletDocument> {
    this.logger.log(`Creating organization bonus wallet: ${organizationName}`);

    return this.walletRepository.createOrganizationWallet(
      organizationName || 'Organization Bonus Wallet',
    );
  }

  /**
   * Fund organization bonus wallet
   *
   * @param amount - Amount in kobo
   * @param reason - Reason for funding
   * @returns Updated organization bonus wallet
   */
  async fundOrganizationBonusWallet(
    amount: number,
    reason?: string,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Admin funding organization bonus wallet with ${amount} kobo. Reason: ${reason || 'Not specified'}`,
    );

    let wallet = await this.getOrganizationBonusWallet();
    if (!wallet) {
      wallet = await this.createOrganizationBonusWallet('Organization Bonus Wallet');
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.total_deposited += amount;
    await wallet.save();

    // Create a transaction record for the funding
    try {
      const reference = `BONUS_FUND_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      await this.transactionModel.create({
        user_id: wallet._id,
        user_type: 'organization',
        type: 'bonus_wallet_funding',
        amount,
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        status: 'completed',
        reference,
        description: reason || 'Organization bonus wallet funding',
        metadata: {
          reason: reason || 'funding',
        },
        completed_at: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to create transaction record: ${error?.message ?? error}`);
    }

    this.logger.log(
      `Organization bonus wallet funded successfully. New balance: ₦${(wallet.balance / 100).toFixed(2)}`,
    );

    return wallet;
  }

  /**
   * Add funds to staff bonus wallet
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo
   * @returns Updated wallet
   */
  async addToBonus(
    userId: MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Adding ${amount} kobo to bonus wallet for user ${userId.toString()}`,
    );

    const wallet = await this.getWallet(userId);

    if (wallet.user_type !== 'staff') {
      throw new Error('Only staff can have bonus wallets');
    }

    wallet.bonus_balance += amount;
    await wallet.save();

    return wallet;
  }

  /**
   * Get bonus balance (staff only)
   *
   * @param userId - User's ObjectId
   * @returns Bonus balance
   */
  async getBonusBalance(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
  ): Promise<number> {
    let wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      this.logger.warn(`Wallet not found for user ${userId.toString()}, creating a new staff wallet for bonus access.`);
      wallet = await this.createWallet(userId, 'staff');
    }

    if (wallet.user_type !== 'staff') {
      throw new Error('Only staff can have bonus wallets');
    }

    return wallet.bonus_balance;
  }

  /**
   * Transfer bonus to main wallet (staff only)
   *
   * @param userId - User's ObjectId
   * @param amount - Amount in kobo (optional, if not provided, transfer all)
   * @returns Updated wallet
   */
  async transferBonusToWallet(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount?: number,
  ): Promise<WalletDocument> {
    this.logger.log(
      `Transferring bonus to main wallet for user ${userId.toString()}`,
    );

    const wallet = await this.getWallet(userId);

    if (wallet.user_type !== 'staff') {
      throw new Error('Only staff can transfer bonus');
    }

    const bonusBalanceBefore = wallet.bonus_balance;
    const mainBalanceBefore = wallet.balance;

    // Use all bonus balance if amount not specified
    const transferAmount = amount || wallet.bonus_balance;

    if (transferAmount > wallet.bonus_balance) {
      throw new Error('Insufficient bonus balance');
    }

    if (transferAmount <= 0) {
      throw new Error('No bonus balance to transfer');
    }

    // Transfer from bonus to main wallet
    wallet.bonus_balance -= transferAmount;
    wallet.balance += transferAmount;
    wallet.total_earned += transferAmount;

    await wallet.save();

    const bonusBalanceAfter = wallet.bonus_balance;
    const mainBalanceAfter = wallet.balance;

    // Record transactions for auditability
    try {
      const baseRef = `BONUS_TRANSFER_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      await this.transactionModel.create([
        {
          user_id: userId,
          user_type: 'staff',
          type: 'bonus_transfer',
          amount: transferAmount,
          balance_before: bonusBalanceBefore,
          balance_after: bonusBalanceAfter,
          status: 'completed',
          reference: `${baseRef}_BONUS`,
          description: 'Bonus balance debited to main wallet',
          metadata: {
            from: 'bonus_balance',
            to: 'main_wallet',
          },
          completed_at: new Date(),
        },
        {
          user_id: userId,
          user_type: 'staff',
          type: 'bonus_transfer',
          amount: transferAmount,
          balance_before: mainBalanceBefore,
          balance_after: mainBalanceAfter,
          status: 'completed',
          reference: `${baseRef}_MAIN`,
          description: 'Main wallet credited from bonus balance',
          metadata: {
            from: 'bonus_balance',
            to: 'main_wallet',
          },
          completed_at: new Date(),
        },
      ]);
    } catch (error) {
      this.logger.error(`Failed to record bonus transfer transactions: ${error?.message ?? error}`);
    }

    this.logger.log(
      `Transferred ${transferAmount} kobo from bonus to main wallet for user ${userId.toString()}`,
    );

    return wallet;
  }

  /**
   * Transfer funds between wallets
   *
   * @param fromWalletId - Source wallet ID
   * @param toWalletId - Destination wallet ID
   * @param amount - Amount in kobo
   * @param fromUserType - Source user type
   * @param toUserType - Destination user type
   * @param description - Transaction description
   * @returns Transfer result
   */
  async transferFunds(
    fromWalletId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    toWalletId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount: number,
    fromUserType: string,
    toUserType: string,
    description: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Transferring ${amount} kobo from ${fromWalletId.toString()} to ${toWalletId.toString()}`,
    );

    // Get both wallets
    const fromWallet = await this.walletRepository.findById(fromWalletId);
    const toWallet = await this.walletRepository.findById(toWalletId);

    if (!fromWallet) {
      throw new NotFoundException('Source wallet not found');
    }

    if (!toWallet) {
      throw new NotFoundException('Destination wallet not found');
    }

    // Ensure balances are numbers before performing operations
    fromWallet.balance = Number(fromWallet.balance) || 0;
    fromWallet.total_spent = Number(fromWallet.total_spent) || 0;
    toWallet.balance = Number(toWallet.balance) || 0;
    toWallet.total_earned = Number(toWallet.total_earned) || 0;

    // Check sufficient balance
    if (fromWallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance in source wallet. Available: ₦${fromWallet.balance / 100}`,
      );
    }

    // Debit source wallet
    fromWallet.balance -= amount;
    fromWallet.total_spent += amount;

    // Credit destination wallet
    toWallet.balance += amount;
    toWallet.total_earned += amount;

    // Save both wallets
    await Promise.all([fromWallet.save(), toWallet.save()]);

    this.logger.log(
      `Successfully transferred ₦${(amount / 100).toFixed(2)} from ${fromUserType} to ${toUserType}`,
    );

    return {
      success: true,
      message: description,
    };
  }
}
