import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SavingsAccount,
  SavingsAccountDocument,
} from '../../schemas/savings-account.schema';

@Injectable()
export class SavingsService {
  private readonly logger = new Logger(SavingsService.name);

  constructor(
    @InjectModel(SavingsAccount.name)
    private readonly savingsAccountModel: Model<SavingsAccountDocument>,
  ) {}

  /**
   * Get savings account by user ID and type
   */
  async getByUserId(
    userId: Types.ObjectId | string,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<SavingsAccountDocument | null> {
    try {
      return await this.savingsAccountModel
        .findOne({ user_id: userId, user_type: userType })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get savings account for user ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to retrieve savings account');
    }
  }

  /**
   * Create or get savings account for a user
   */
  async getOrCreateSavingsAccount(
    userId: Types.ObjectId | string,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<SavingsAccountDocument> {
    try {
      let account = await this.savingsAccountModel
        .findOne({ user_id: userId, user_type: userType })
        .exec();

      if (!account) {
        this.logger.log(`Creating new savings account for ${userType} ${userId}`);
        account = await this.savingsAccountModel.create({
          user_id: userId,
          user_type: userType,
          savings_percentage: null,
          balance: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          total_interest_earned: 0,
        });
        this.logger.log(`Savings account created: ${account._id}`);
      }

      return account;
    } catch (error) {
      this.logger.error(`Failed to get/create savings account: ${error.message}`);
      throw new BadRequestException('Failed to create savings account');
    }
  }

  /**
   * Set savings percentage for a user
   * Creates account if it doesn't exist
   */
  async setSavingsPercentage(
    userId: Types.ObjectId | string,
    percentage: number,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<SavingsAccountDocument> {
    try {
      // Validate percentage
      if (percentage < 0 || percentage > 100) {
        throw new BadRequestException('Savings percentage must be between 0 and 100');
      }

      const now = new Date();
      
      // Use upsert to create account if it doesn't exist
      const account = await this.savingsAccountModel
        .findOneAndUpdate(
          { user_id: userId, user_type: userType },
          {
            $set: {
              savings_percentage: percentage,
              savings_percentage_set_at: now,
            },
            $setOnInsert: {
              user_id: userId,
              user_type: userType,
              balance: 0,
              total_deposits: 0,
              total_withdrawals: 0,
              total_interest_earned: 0,
            },
          },
          { new: true, upsert: true },
        )
        .exec();

      this.logger.log(`Savings percentage set to ${percentage}% for ${userType} ${userId}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to set savings percentage: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to set savings percentage');
    }
  }

  /**
   * Add to savings balance (deposit)
   */
  async addToSavings(
    userId: Types.ObjectId | string,
    amount: number,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<SavingsAccountDocument> {
    try {
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      const account = await this.getOrCreateSavingsAccount(userId, userType);
      
      account.balance += amount;
      account.total_deposits += amount;
      await account.save();

      this.logger.log(`Added ₦${(amount / 100).toFixed(2)} to savings for ${userType} ${userId}. New balance: ₦${(account.balance / 100).toFixed(2)}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to add to savings: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add to savings');
    }
  }

  /**
   * Withdraw from savings balance
   */
  async withdrawFromSavings(
    userId: Types.ObjectId | string,
    amount: number,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<SavingsAccountDocument> {
    try {
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      const account = await this.getByUserId(userId, userType);
      if (!account) {
        throw new BadRequestException('Savings account not found');
      }

      if (account.balance < amount) {
        throw new BadRequestException('Insufficient savings balance');
      }

      account.balance -= amount;
      account.total_withdrawals += amount;
      await account.save();

      this.logger.log(`Withdrew ₦${(amount / 100).toFixed(2)} from savings for ${userType} ${userId}. New balance: ₦${(account.balance / 100).toFixed(2)}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to withdraw from savings: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to withdraw from savings');
    }
  }

  /**
   * Get savings balance for a user
   */
  async getSavingsBalance(
    userId: Types.ObjectId | string,
    userType: 'farmer' | 'staff' = 'farmer',
  ): Promise<{
    balance: number;
    savings_percentage: number | null;
    total_deposits: number;
    total_withdrawals: number;
    total_interest_earned: number;
  }> {
    try {
      const account = await this.getByUserId(userId, userType);
      
      if (!account) {
        return {
          balance: 0,
          savings_percentage: null,
          total_deposits: 0,
          total_withdrawals: 0,
          total_interest_earned: 0,
        };
      }

      return {
        balance: account.balance,
        savings_percentage: account.savings_percentage,
        total_deposits: account.total_deposits,
        total_withdrawals: account.total_withdrawals,
        total_interest_earned: account.total_interest_earned,
      };
    } catch (error) {
      this.logger.error(`Failed to get savings balance: ${error.message}`);
      throw new BadRequestException('Failed to get savings balance');
    }
  }
}
