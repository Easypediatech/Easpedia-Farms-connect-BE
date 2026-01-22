import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WalletService } from '../wallet/wallet.service';
import { StaffService } from '../staff/staff.service';
import { FundBonusWalletDto } from './dto/fund-bonus-wallet.dto';
import { AssignBonusDto } from './dto/assign-bonus.dto';
import { TransferBonusDto } from './dto/transfer-bonus.dto';
import { StaffBonusDto } from './dto/staff-bonus.dto';
import { WalletDocument } from '../../schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../../schemas/transaction.schema';

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly staffService: StaffService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  private generateReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
  }

  /**
   * Get or create organization bonus wallet
   *
   * @returns Organization bonus wallet
   */
  async getOrganizationBonusWallet(): Promise<WalletDocument | null> {
    return this.walletService.getOrganizationBonusWallet();
  }

  /**
   * Fund organization bonus wallet
   *
   * @param fundBonusWalletDto - Funding data
   * @returns Updated wallet
   */
  async fundOrganizationBonusWallet(
    fundBonusWalletDto: FundBonusWalletDto,
  ): Promise<WalletDocument> {
    this.logger.log('Admin funding organization bonus wallet');

    // Convert amount from Naira to kobo
    const amountInKobo = Math.round(fundBonusWalletDto.amount * 100);

    return this.walletService.fundOrganizationBonusWallet(
      amountInKobo,
      fundBonusWalletDto.reason,
    );
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
    return this.walletService.createOrganizationBonusWallet(organizationName);
  }

  /**
   * Assign bonuses to multiple staff
   *
   * @param assignBonusDto - Assignment data
   * @returns Assignment results
   */
  async assignBonuses(assignBonusDto: AssignBonusDto): Promise<{
    success: number;
    failed: number;
    results: Array<{
      staffId: string;
      success: boolean;
      message: string;
      bonusBalance?: number;
    }>;
  }> {
    this.logger.log(`Assigning bonuses to ${assignBonusDto.staffBonuses.length} staff members`);

    // Check if organization bonus wallet has sufficient balance
    const orgWallet = await this.getOrganizationBonusWallet();
    if (!orgWallet) {
      throw new BadRequestException('Organization bonus wallet not found. Please fund the bonus wallet first.');
    }

    // Calculate total amount needed
    const totalAmountNeeded = assignBonusDto.staffBonuses.reduce(
      (sum, bonus) => sum + Math.round(bonus.amount * 100),
      0,
    );

    if (orgWallet.balance < totalAmountNeeded) {
      throw new BadRequestException(
        `Insufficient bonus wallet balance. Required: ₦${(totalAmountNeeded / 100).toFixed(2)}, Available: ₦${(orgWallet.balance / 100).toFixed(2)}`,
      );
    }

    const results: Array<{
      staffId: string;
      success: boolean;
      message: string;
      bonusBalance?: number;
    }> = [];

    let successCount = 0;
    let failedCount = 0;

    for (const staffBonus of assignBonusDto.staffBonuses) {
      try {
        const staff = await this.staffService.getStaffById(staffBonus.staffId);
        const staffObjectId = new Types.ObjectId(staffBonus.staffId);

        const amountInKobo = Math.round(staffBonus.amount * 100);

        // Load staff wallet and calculate balances
        const staffWallet = await this.walletService.getWallet(staffObjectId);
        if (staffWallet.user_type !== 'staff') {
          throw new BadRequestException('Only staff can receive bonuses');
        }

        const staffBonusBefore = staffWallet.bonus_balance || 0;
        const staffBonusAfter = staffBonusBefore + amountInKobo;

        const orgBalanceBefore = orgWallet.balance;
        orgWallet.balance -= amountInKobo;
        orgWallet.total_spent = (orgWallet.total_spent || 0) + amountInKobo;

        staffWallet.bonus_balance = staffBonusAfter;
        await staffWallet.save();

        const orgBalanceAfter = orgWallet.balance;

        // Record transactions for both org and staff bonus credit
        const orgReference = this.generateReference('BONUS_ALLOC_ORG');
        const staffReference = this.generateReference('BONUS_ALLOC_STAFF');

        await this.transactionModel.create([
          {
            user_id: orgWallet._id,
            user_type: 'organization',
            type: 'bonus_allocation',
            amount: amountInKobo,
            balance_before: orgBalanceBefore,
            balance_after: orgBalanceAfter,
            status: 'completed',
            reference: orgReference,
            description: staffBonus.reason || 'Bonus allocation to staff',
            metadata: {
              staffId: staffBonus.staffId,
              direction: 'out',
            },
            completed_at: new Date(),
          },
          {
            user_id: staffObjectId,
            user_type: 'staff',
            type: 'bonus_allocation',
            amount: amountInKobo,
            balance_before: staffBonusBefore,
            balance_after: staffBonusAfter,
            status: 'completed',
            reference: staffReference,
            description: staffBonus.reason || 'Bonus allocation from organization',
            metadata: {
              staffId: staffBonus.staffId,
              staffName: `${staff.firstName} ${staff.lastName}`.trim(),
              source: 'organization_bonus_wallet',
            },
            completed_at: new Date(),
          },
        ]);

        results.push({
          staffId: staffBonus.staffId,
          success: true,
          message: `Bonus of ₦${staffBonus.amount.toFixed(2)} assigned successfully`,
          bonusBalance: staffBonusAfter / 100,
        });

        successCount++;
        this.logger.log(`Bonus assigned to staff ${staffBonus.staffId}: ₦${staffBonus.amount}`);
      } catch (error) {
        results.push({
          staffId: staffBonus.staffId,
          success: false,
          message: error?.message || 'Failed to assign bonus',
        });
        failedCount++;
        this.logger.error(`Failed to assign bonus to staff ${staffBonus.staffId}: ${error?.message}`);
      }
    }

    // Save updated organization wallet once after processing
    if (successCount > 0) {
      await orgWallet.save();
    }

    this.logger.log(`Bonus assignment completed. Success: ${successCount}, Failed: ${failedCount}`);

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Transfer bonus to main wallet for staff
   *
   * @param transferBonusDto - Transfer data
   * @returns Updated wallet
   */
  async transferBonusToWallet(
    transferBonusDto: TransferBonusDto,
  ): Promise<WalletDocument> {
    this.logger.log(`Transferring bonus to main wallet for staff ${transferBonusDto.staffId}`);

    // Validate staff exists
    await this.staffService.getStaffById(transferBonusDto.staffId);

    // Convert amount to kobo if provided
    const amountInKobo = transferBonusDto.amount 
      ? Math.round(transferBonusDto.amount * 100)
      : undefined;

    const staffObjectId = new Types.ObjectId(String(transferBonusDto.staffId));

    return this.walletService.transferBonusToWallet(
      staffObjectId,
      amountInKobo,
    );
  }

  /**
   * Get staff bonus balance
   *
   * @param staffId - Staff ID
   * @returns Bonus balance in Naira
   */
  async getStaffBonusBalance(staffId: string): Promise<number> {
    // Validate staff exists
    await this.staffService.getStaffById(staffId);

    const staffObjectId = new Types.ObjectId(String(staffId));

    const bonusBalanceInKobo = await this.walletService.getBonusBalance(
      staffObjectId,
    );

    return bonusBalanceInKobo / 100; // Convert to Naira
  }

  /**
   * Get all staff with their bonus balances
   *
   * @returns List of staff with bonus balances
   */
  async getAllStaffBonusBalances(): Promise<Array<{
    staffId: string;
    firstName: string;
    lastName: string;
    bonusBalance: number;
  }>> {
    const staffList = await this.staffService.getAllStaff({
      status: 'active',
      is_approved: true,
    });

    const staffWithBonuses: Array<{
      staffId: string;
      firstName: string;
      lastName: string;
      bonusBalance: number;
    }> = [];

    for (const staff of staffList.staff) {
      try {
        const bonusBalance = await this.getStaffBonusBalance(staff.id);
        staffWithBonuses.push({
          staffId: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          bonusBalance,
        });
      } catch (error) {
        this.logger.error(`Failed to get bonus balance for staff ${staff.id}: ${error?.message}`);
      }
    }

    return staffWithBonuses;
  }

  async getBonusTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    staffId?: string;
    search?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

    const filter: any = {
      type: { $in: ['bonus_wallet_funding', 'bonus_allocation', 'bonus_transfer'] },
    };

    if (params.type) {
      filter.type = params.type;
    }

    if (params.staffId) {
      filter.user_id = new Types.ObjectId(params.staffId);
    }

    if (params.search) {
      filter.reference = { $regex: params.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(filter),
    ]);

    const mapped = items.map((tx) => ({
      ...tx,
      amountNaira: (tx.amount || 0) / 100,
    }));

    return {
      items: mapped,
      total,
      page,
      limit,
    };
  }
}