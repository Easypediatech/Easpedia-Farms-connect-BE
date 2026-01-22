import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';

@Injectable()
export class WalletRepository {
  private readonly logger = new Logger(WalletRepository.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
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

    const wallet = new this.walletModel({
      user_id: userId,
      user_type: userType,
      balance: 0,
      escrow_balance: 0,
      savings_balance: 0,
      pension_balance: 0,
      bonus_balance: 0,
      total_earned: 0,
      total_spent: 0,
      total_withdrawn: 0,
      total_deposited: 0,
    });

    return wallet.save();
  }

  /**
   * Find wallet by user ID
   *
   * @param userId - User's ObjectId
   * @returns Wallet or null
   */
  async findByUserId(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
  ): Promise<WalletDocument | null> {
    const wallet = await this.walletModel.findOne({ user_id: userId }).exec();

    return wallet;
  }

  /**
   * Update wallet balance
   *
   * @param userId - User's ObjectId
   * @param amount - Amount to add/subtract (in kobo)
   * @param type - Type of transaction
   * @returns Updated wallet
   */
  async updateBalance(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount: number,
    type: 'credit' | 'debit',
  ): Promise<WalletDocument> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (type === 'credit') {
      wallet.balance += amount;
      wallet.total_earned += amount;
    } else {
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }
      wallet.balance -= amount;
      wallet.total_spent += amount;
    }

    return wallet.save();
  }

  /**
   * Add to escrow balance
   *
   * @param userId - User's ObjectId
   * @param amount - Amount to lock (in kobo)
   * @returns Updated wallet
   */
  async addToEscrow(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount: number,
  ): Promise<WalletDocument> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance -= amount;
    wallet.escrow_balance += amount;

    return wallet.save();
  }

  /**
   * Release from escrow balance
   *
   * @param userId - User's ObjectId
   * @param amount - Amount to release (in kobo)
   * @param toBalance - Whether to add to balance or not
   * @returns Updated wallet
   */
  async releaseFromEscrow(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount: number,
    toBalance: boolean = true,
  ): Promise<WalletDocument> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.escrow_balance < amount) {
      throw new Error('Insufficient escrow balance');
    }

    wallet.escrow_balance -= amount;

    if (toBalance) {
      wallet.balance += amount;
    }

    return wallet.save();
  }

  /**
   * Update savings balance
   *
   * @param userId - User's ObjectId
   * @param amount - Amount to add/subtract (in kobo)
   * @param type - Type of transaction
   * @returns Updated wallet
   */
  async updateSavings(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    amount: number,
    type: 'deposit' | 'withdrawal',
  ): Promise<WalletDocument> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (type === 'deposit') {
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }
      wallet.balance -= amount;
      wallet.savings_balance += amount;
    } else {
      if (wallet.savings_balance < amount) {
        throw new Error('Insufficient savings balance');
      }
      wallet.savings_balance -= amount;
      wallet.balance += amount;
    }

    return wallet.save();
  }

  /**
   * Update bank details
   *
   * @param userId - User's ObjectId
   * @param bankDetails - Bank account details
   * @returns Updated wallet
   */
  async updateBankDetails(
    userId: Types.ObjectId | MongooseSchema.Types.ObjectId,
    bankDetails: {
      bank_name: string;
      bank_code?: string;
      account_number: string;
      account_name: string;
      bvn?: string;
    },
  ): Promise<WalletDocument | null> {
    return this.walletModel
      .findOneAndUpdate(
        { user_id: userId },
        { $set: bankDetails },
        { new: true },
      )
      .exec();
  }

  /**
   * Find wallet by ID
   *
   * @param walletId - Wallet ID
   * @returns Wallet or null
   */
  async findById(
    walletId: Types.ObjectId | MongooseSchema.Types.ObjectId,
  ): Promise<WalletDocument | null> {
    return this.walletModel.findById(walletId).exec();
  }

  /**
   * Find organization wallet by name (optional)
   *
   * @param organizationName - Name of the organization wallet (optional)
   * @returns Organization wallet or null
   */
  async findOrganizationWallet(organizationName?: string): Promise<WalletDocument | null> {
    const query: any = { user_type: 'organization' };
    if (organizationName) {
      query.organization_name = organizationName;
    }
    return this.walletModel.findOne(query).exec();
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
    this.logger.log(`Creating organization wallet: ${organizationName}`);

    // Use atomic upsert to avoid duplicate key errors when concurrent requests try to create
    return this.walletModel.findOneAndUpdate(
      { user_type: 'organization', organization_name: organizationName },
      {
        $setOnInsert: {
          user_type: 'organization',
          organization_name: organizationName,
          balance: 0,
          escrow_balance: 0,
          savings_balance: 0,
          pension_balance: 0,
          bonus_balance: 0,
          total_earned: 0,
          total_spent: 0,
          total_withdrawn: 0,
          total_deposited: 0,
        },
      },
      { new: true, upsert: true },
    );
  }
}
