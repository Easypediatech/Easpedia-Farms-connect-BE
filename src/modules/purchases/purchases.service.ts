import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { PurchasesRepository } from './purchases.repository';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GetPurchasesQueryDto } from './dto/get-purchases-query.dto';
import { Purchase, PurchaseDocument } from '../../schemas/purchase.schema';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { Wallet, WalletDocument } from '../../schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import { Loan, LoanDocument } from '../../schemas/loan.schema';
import { SavingsAccount, SavingsAccountDocument } from '../../schemas/savings-account.schema';
import { FarmerRepository } from '../farmer/farmer.repository';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly purchasesRepository: PurchasesRepository,
    private readonly farmerRepository: FarmerRepository,
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
    @InjectModel(SavingsAccount.name)
    private readonly savingsAccountModel: Model<SavingsAccountDocument>,
  ) {}

  async createPurchase(
    createPurchaseDto: CreatePurchaseDto,
    recordedById: string,
  ): Promise<PurchaseDocument> {
    let purchase: PurchaseDocument | null = null;

    try {
      // 1. Lookup farmer by ID to get the farmer's name
      const farmer = await this.farmerModel.findById(
        createPurchaseDto.farmerId,
      );
      if (!farmer) {
        throw new NotFoundException(
          `Farmer with ID ${createPurchaseDto.farmerId} not found`,
        );
      }

      // 2. Calculate total amount in kobo (price is expected to be in naira, convert to kobo)
      const pricePerKgInKobo = createPurchaseDto.pricePerKg * 100;
      const totalAmountInKobo = pricePerKgInKobo * createPurchaseDto.weightKg;

      // 3. Create the purchase record first
      const purchaseData = {
        ...createPurchaseDto,
        farmerName: farmer.full_name,
        pricePerKg: pricePerKgInKobo,
        totalAmount: totalAmountInKobo,
      };

      purchase = await this.purchasesRepository.create(
        purchaseData,
        recordedById,
      );

      // 4. Handle financial transactions
      await this.processPaymentTransactions(
        farmer,
        totalAmountInKobo,
        purchase,
        createPurchaseDto,
      );

      // 5. Update purchase status to completed
      await this.purchasesRepository.updateStatus(
        purchase._id.toString(),
        'completed',
      );
      await this.purchasesRepository.updatePaymentStatus(
        purchase._id.toString(),
        'paid',
      );

      // 6. Update farmer sales statistics
      try {
        const updateData = {
          $inc: {
            total_sales: 1, // Increment number of sales
            total_earnings: totalAmountInKobo, // Add to total earnings in kobo
            completed_sales: 1, // Increment completed sales count
          },
        };
        await this.farmerRepository.updateFarmerRaw(
          farmer._id.toString(),
          updateData,
        );
        console.log(
          `Farmer sales statistics updated for farmer: ${farmer._id}`,
        );
      } catch (statsError) {
        // Log error but don't fail the purchase
        console.error('Failed to update farmer sales statistics:', statsError);
      }

      return purchase;
    } catch (error) {
      // Enhanced error handling with specific error types
      if (purchase) {
        await this.purchasesRepository.updateStatus(
          purchase._id.toString(),
          'failed',
        );
        await this.purchasesRepository.updatePaymentStatus(
          purchase._id.toString(),
          'failed',
        );
      }

      // Log detailed error for debugging
      console.error('Purchase creation failed:', {
        error: error.message,
        stack: error.stack,
        farmerId: createPurchaseDto.farmerId,
        purchaseId: purchase?._id,
      });

      // Throw appropriate error based on type
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error.name === 'ValidationError') {
        throw new BadRequestException(`Validation error: ${error.message}`);
      } else if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid data format: ${error.message}`);
      } else {
        throw new BadRequestException(
          `Failed to create purchase: ${error.message}`,
        );
      }
    }
  }

  async retryPurchase(purchaseId: string): Promise<PurchaseDocument> {
    // Enhanced validation for purchase ID
    if (!purchaseId || purchaseId === 'undefined' || purchaseId === 'null') {
      throw new BadRequestException('Invalid purchase ID provided');
    }

    // Validate ObjectId format
    if (!purchaseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid purchase ID format');
    }

    console.log(`Starting retry for purchase ID: ${purchaseId}`);

    try {
      const purchase = await this.purchasesRepository.findById(purchaseId);
      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
      }

      if (purchase.status !== 'failed') {
        throw new BadRequestException(
          `Purchase ${purchaseId} is not in failed status. Current status: ${purchase.status}. Only failed purchases can be retried.`,
        );
      }

      // Check for idempotency - prevent multiple retries running simultaneously
      const retryReference = `RETRY_${purchaseId}_${Date.now()}`;

      console.log(`Processing retry with reference: ${retryReference}`);

      // Mark purchase as processing to prevent concurrent retries
      await this.purchasesRepository.updateStatus(purchaseId, 'processing');
      await this.purchasesRepository.updatePaymentStatus(
        purchaseId,
        'processing',
      );

      // Validate farmer exists
      const farmer = await this.farmerModel.findById(purchase.farmerId);
      if (!farmer) {
        throw new NotFoundException(
          `Farmer with ID ${purchase.farmerId} not found`,
        );
      }

      console.log(
        `Retrying financial transactions for farmer: ${farmer.full_name} (${farmer._id})`,
      );

      // Create retry purchase DTO
      const retryPurchaseDto = {
        farmerId: purchase.farmerId,
        farmerPhone: purchase.farmerPhone,
        weightKg: purchase.weightKg,
        pricePerKg: purchase.pricePerKg / 100, // Convert back from kobo to naira for processing
        unit: purchase.unit,
        paymentMethod: purchase.paymentMethod,
        location: purchase.location || '',
        notes: `${purchase.notes || ''} [RETRIED: ${retryReference}]`,
      };

      // Process financial transactions with enhanced error handling
      await this.processPaymentTransactions(
        farmer,
        purchase.totalAmount,
        purchase as PurchaseDocument,
        retryPurchaseDto,
        retryReference,
      );

      // Update purchase status to completed only after successful transaction processing
      await this.purchasesRepository.updateStatus(purchaseId, 'completed');
      await this.purchasesRepository.updatePaymentStatus(purchaseId, 'paid');

      // Update farmer sales statistics
      try {
        const updateData = {
          $inc: {
            total_sales: 1, // Increment number of sales
            total_earnings: purchase.totalAmount, // Add to total earnings in kobo
            completed_sales: 1, // Increment completed sales count
          },
        };
        await this.farmerRepository.updateFarmerRaw(
          farmer._id.toString(),
          updateData,
        );
        console.log(
          `Farmer sales statistics updated for retry - farmer: ${farmer._id}`,
        );
      } catch (statsError) {
        // Log error but don't fail the purchase
        console.error(
          'Failed to update farmer sales statistics on retry:',
          statsError,
        );
      }

      console.log(`Purchase retry completed successfully: ${purchaseId}`);

      // Return the updated purchase
      const updatedPurchase =
        await this.purchasesRepository.findById(purchaseId);
      return updatedPurchase as PurchaseDocument;
    } catch (error) {
      // Enhanced error handling for retry
      console.error('Purchase retry failed:', {
        error: error.message,
        stack: error.stack,
        purchaseId,
      });

      // If retry fails, mark as failed again
      try {
        await this.purchasesRepository.updateStatus(purchaseId, 'failed');
        await this.purchasesRepository.updatePaymentStatus(
          purchaseId,
          'failed',
        );
      } catch (updateError) {
        console.error(
          'Failed to update purchase status after retry failure:',
          updateError,
        );
      }

      // Throw appropriate error based on type
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      } else if (error.name === 'ValidationError') {
        throw new BadRequestException(
          `Validation error during retry: ${error.message}`,
        );
      } else {
        throw new BadRequestException(
          `Failed to retry purchase: ${error.message}`,
        );
      }
    }
  }

  async getKPIs() {
    const [
      totalPurchases,
      totalAmountSpent,
      completedPurchases,
      pendingPurchases,
      totalWeight,
      averagePrice,
    ] = await Promise.all([
      this.purchasesRepository.count(),
      this.purchasesRepository.getTotalAmountSpent(),
      this.purchasesRepository.count({ status: 'completed' }),
      this.purchasesRepository.count({ status: 'pending' }),
      this.purchasesRepository.getTotalWeight(),
      this.purchasesRepository.getAveragePrice(),
    ]);

    return {
      totalPurchases,
      totalAmountSpent: Math.round(totalAmountSpent / 100), // Convert from kobo to naira
      completedPurchases,
      pendingPurchases,
      totalWeight,
      averagePrice: Math.round(averagePrice / 100), // Convert from kobo to naira
    };
  }

  private async processPaymentTransactions(
    farmer: any,
    totalAmountInKobo: number,
    purchase: PurchaseDocument,
    createPurchaseDto: CreatePurchaseDto,
    retryReference?: string,
  ): Promise<void> {
    console.log(`Processing payment transactions:`, {
      farmerId: farmer._id,
      farmerUserId: farmer.user_id, // Log both for clarity
      farmerName: farmer.full_name,
      totalAmountInKobo,
      purchaseId: purchase._id,
      retryReference,
    });
    try {
      // 1. Find or create wallet for farmer
      console.log(
        `Looking for wallet for farmer user_id: ${farmer.user_id} (farmer._id: ${farmer._id})`,
      );
      let wallet = await this.walletModel.findOne({
        user_id: farmer.user_id,
        user_type: 'farmer',
      });

      if (!wallet) {
        console.log(
          `Creating new wallet for farmer user_id: ${farmer.user_id}`,
        );
        wallet = await this.walletModel.create({
          user_id: farmer.user_id,
          user_type: 'farmer',
          balance: 0,
          is_active: true,
        });
        console.log(`Wallet created successfully: ${wallet._id}`);
      } else {
        console.log(
          `Found existing wallet: ${wallet._id}, current balance: ${wallet.balance}`,
        );
      }

      // 2. Check for outstanding loans that have passed due date (defaulted)
      console.log(`Checking for defaulted loans for farmer: ${farmer._id}`);
      const currentDate = new Date();
      const outstandingLoan = await this.loanModel
        .findOne({
          farmer_id: farmer._id,
          status: { $in: ['approved', 'active', 'defaulted'] },
          amount_outstanding: { $gt: 0 },
          due_date: { $lt: currentDate }, // Only deduct if loan has passed due date
        })
        .sort({ createdAt: -1 }); // Get most recent loan

      let loanDeductionAmount = 0;
      let loanDeductionTransactionId: string | undefined;
      let netAmountToCreditWallet = totalAmountInKobo;

      // 3. Process loan deduction if defaulted loan exists (past due date)
      if (outstandingLoan && outstandingLoan.amount_outstanding > 0) {
        loanDeductionAmount = Math.min(
          totalAmountInKobo,
          outstandingLoan.amount_outstanding,
        );
        console.log(`Defaulted loan found (past due date):`, {
          loanId: outstandingLoan._id,
          amountOutstanding: outstandingLoan.amount_outstanding,
          loanDeductionAmount,
          totalAmountInKobo,
          dueDate: outstandingLoan.due_date,
          currentDate,
        });

        try {
          // Create loan payment transaction
          const balanceBeforeDeduction = wallet.balance;
          console.log(`Creating loan payment transaction...`);

          const loanPaymentTransaction = await this.transactionModel.create({
            user_id: farmer.user_id, // Using farmer.user_id (correct user ID)
            user_type: 'farmer',
            type: 'loan_repayment',
            amount: loanDeductionAmount,
            balance_before: balanceBeforeDeduction,
            balance_after: balanceBeforeDeduction, // Wallet balance doesn't change for loan payment
            description: `Loan payment deducted from purchase (Purchase ID: ${purchase._id})`,
            status: 'completed',
            reference:
              retryReference || `LOAN_DEDUCT_${purchase._id}_${Date.now()}`,
            loan_id: outstandingLoan._id,
            completed_at: new Date(),
          });

          loanDeductionTransactionId = loanPaymentTransaction._id.toString();
          console.log(
            `Loan payment transaction created: ${loanDeductionTransactionId}`,
          );

          // Update loan outstanding amount
          const previousOutstanding = outstandingLoan.amount_outstanding;
          const previousPaid = outstandingLoan.amount_paid;

          outstandingLoan.amount_outstanding -= loanDeductionAmount;
          outstandingLoan.amount_paid += loanDeductionAmount;

          if (outstandingLoan.amount_outstanding === 0) {
            outstandingLoan.status = 'completed';
            outstandingLoan.completed_at = new Date();
            console.log(`Loan fully paid and marked as completed`);
          }

          await outstandingLoan.save();
          console.log(`Loan updated:`, {
            loanId: outstandingLoan._id,
            previousOutstanding,
            newOutstanding: outstandingLoan.amount_outstanding,
            previousPaid,
            newPaid: outstandingLoan.amount_paid,
            status: outstandingLoan.status,
          });

          // Calculate remaining amount to credit to wallet
          netAmountToCreditWallet = totalAmountInKobo - loanDeductionAmount;
          console.log(
            `Net amount to credit wallet: ${netAmountToCreditWallet}`,
          );
        } catch (loanError) {
          console.error('Loan deduction failed:', {
            error: loanError.message,
            stack: loanError.stack,
            farmerId: farmer._id,
            loanId: outstandingLoan._id,
            loanDeductionAmount,
          });
          throw new BadRequestException(
            `Failed to process loan deduction: ${loanError.message}`,
          );
        }
      } else {
        console.log(`No defaulted loans found for farmer: ${farmer._id} (no loans past due date)`);
      }

      // 4. Check for savings deduction
      let savingsDeductionAmount = 0;
      let savingsTransactionId: string | undefined;

      try {
        // Get farmer's savings account
        const savingsAccount = await this.savingsAccountModel.findOne({
          user_id: farmer.user_id,
          user_type: 'farmer',
        });

        if (savingsAccount && savingsAccount.savings_percentage && savingsAccount.savings_percentage > 0) {
          // Calculate savings deduction from net amount (after loan deduction)
          savingsDeductionAmount = Math.round(
            netAmountToCreditWallet * (savingsAccount.savings_percentage / 100)
          );

          if (savingsDeductionAmount > 0) {
            console.log(`Processing savings deduction:`, {
              farmerId: farmer._id,
              savingsPercentage: savingsAccount.savings_percentage,
              netAmountToCreditWallet,
              savingsDeductionAmount,
            });

            // Create savings deposit transaction
            const savingsTransaction = await this.transactionModel.create({
              user_id: farmer.user_id,
              user_type: 'farmer',
              type: 'savings_deposit',
              amount: savingsDeductionAmount,
              balance_before: savingsAccount.balance,
              balance_after: savingsAccount.balance + savingsDeductionAmount,
              description: `Automatic savings (${savingsAccount.savings_percentage}%) from purchase (Purchase ID: ${purchase._id})`,
              status: 'completed',
              reference: retryReference || `SAVINGS_${purchase._id}_${Date.now()}`,
              completed_at: new Date(),
            });

            savingsTransactionId = savingsTransaction._id.toString();
            console.log(`Savings transaction created: ${savingsTransactionId}`);

            // Update savings account balance
            const previousSavingsBalance = savingsAccount.balance;
            savingsAccount.balance += savingsDeductionAmount;
            savingsAccount.total_deposits += savingsDeductionAmount;
            await savingsAccount.save();

            console.log(`Savings account updated:`, {
              savingsAccountId: savingsAccount._id,
              previousBalance: previousSavingsBalance,
              newBalance: savingsAccount.balance,
              savingsDeductionAmount,
            });

            // Reduce net amount to credit wallet
            netAmountToCreditWallet -= savingsDeductionAmount;
            console.log(`Net amount after savings deduction: ${netAmountToCreditWallet}`);
          }
        } else {
          console.log(`No savings percentage set for farmer: ${farmer._id}`);
        }
      } catch (savingsError) {
        // Log savings error but don't fail the purchase - savings is optional
        console.error('Savings deduction failed (non-blocking):', {
          error: savingsError.message,
          stack: savingsError.stack,
          farmerId: farmer._id,
        });
        // Reset savings deduction amount if failed
        savingsDeductionAmount = 0;
      }

      let walletTransactionId: string | undefined;

      // 5. Credit remaining amount to wallet (if any)
      if (netAmountToCreditWallet > 0) {
        console.log(`Crediting wallet with amount: ${netAmountToCreditWallet}`);
        try {
          // Create wallet credit transaction
          const balanceBeforeCredit = wallet.balance;
          const balanceAfterCredit = wallet.balance + netAmountToCreditWallet;

          console.log(`Creating wallet credit transaction:`, {
            balanceBeforeCredit,
            balanceAfterCredit,
            creditAmount: netAmountToCreditWallet,
          });

          const walletTransaction = await this.transactionModel.create({
            user_id: farmer.user_id, // Using farmer.user_id (correct user ID)
            user_type: 'farmer',
            type: 'deposit',
            amount: netAmountToCreditWallet,
            balance_before: balanceBeforeCredit,
            balance_after: balanceAfterCredit,
            description: `Payment for cassava purchase (${createPurchaseDto.weightKg}kg @ ₦${createPurchaseDto.pricePerKg}/kg)`,
            status: 'completed',
            reference:
              retryReference || `PURCHASE_${purchase._id}_${Date.now()}`,
            completed_at: new Date(),
          });

          walletTransactionId = walletTransaction._id.toString();
          console.log(
            `Wallet credit transaction created: ${walletTransactionId}`,
          );

          // Update wallet balance
          const previousBalance = wallet.balance;
          wallet.balance += netAmountToCreditWallet;
          await wallet.save();

          console.log(`Wallet balance updated:`, {
            walletId: wallet._id,
            previousBalance,
            newBalance: wallet.balance,
            creditAmount: netAmountToCreditWallet,
          });
        } catch (walletError) {
          console.error('Wallet credit failed:', {
            error: walletError.message,
            stack: walletError.stack,
            farmerId: farmer._id,
            walletId: wallet._id,
            creditAmount: netAmountToCreditWallet,
          });
          throw new BadRequestException(
            `Failed to credit wallet: ${walletError.message}`,
          );
        }
      } else {
        console.log(
          `No amount to credit wallet (netAmountToCreditWallet: ${netAmountToCreditWallet})`,
        );
      }

      // 6. Update purchase record with transaction references
      console.log(`Updating purchase transaction references:`, {
        purchaseId: purchase._id,
        walletTransactionId,
        loanDeductionAmount,
        loanDeductionTransactionId,
        savingsDeductionAmount,
        savingsTransactionId,
        netAmountCredited: netAmountToCreditWallet,
      });

      await this.purchasesRepository.updateTransactionReferences(
        purchase._id.toString(),
        {
          walletTransactionId,
          loanDeductionAmount,
          loanDeductionTransactionId,
          savingsDeductionAmount,
          savingsTransactionId,
          netAmountCredited: netAmountToCreditWallet,
        },
      );

      console.log(
        `Payment transaction processing completed successfully for purchase: ${purchase._id}`,
      );
    } catch (error) {
      console.error('Payment transaction processing failed:', {
        error: error.message,
        stack: error.stack,
        farmerId: farmer._id,
        purchaseId: purchase._id,
        totalAmount: totalAmountInKobo,
      });
      throw error;
    }
  }

  async getAllPurchases(queryDto: GetPurchasesQueryDto) {
    const { page = 1, limit = 20, status, paymentStatus, farmerId } = queryDto;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Purchase> = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (farmerId) filter.farmerId = farmerId;

    const [purchases, total] = await Promise.all([
      this.purchasesRepository.findAll(filter, skip, limit),
      this.purchasesRepository.count(filter),
    ]);

    return {
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseById(id: string): Promise<Purchase> {
    const purchase = await this.purchasesRepository.findById(id);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }
    return purchase;
  }

  async getFarmerFinancialStatus(farmerId: string): Promise<any> {
    try {
      // Get farmer details
      const farmer = await this.farmerModel.findById(farmerId);
      if (!farmer) {
        throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
      }

      // Get user details for phone number
      const user = await this.farmerModel
        .findOne({ _id: farmerId })
        .populate('user_id');

      // Get wallet info
      const wallet = await this.walletModel.findOne({
        user_id: farmerId,
        user_type: 'farmer',
      });

      // Get outstanding loans
      const outstandingLoans = await this.loanModel
        .find({
          farmer_id: farmerId,
          status: { $in: ['approved', 'active'] },
          amount_outstanding: { $gt: 0 },
        })
        .sort({ createdAt: -1 });

      // Get recent transactions
      const recentTransactions = await this.transactionModel
        .find({
          user_id: farmerId,
          user_type: 'farmer',
        })
        .sort({ createdAt: -1 })
        .limit(10);

      // Get purchase history
      const purchases = await this.purchasesRepository.findAll(
        { farmerId },
        0,
        10,
      );

      return {
        farmer: {
          id: farmer._id,
          name: farmer.full_name,
          phone: (user as any)?.user_id?.phone || 'N/A',
        },
        wallet: wallet
          ? {
              id: wallet._id,
              balance: wallet.balance,
              isActive: true, // Wallet schema doesn't have is_active
            }
          : null,
        outstandingLoans: outstandingLoans.map((loan) => ({
          id: loan._id,
          principalAmount: loan.principal_amount,
          totalRepayment: loan.total_repayment,
          amountOutstanding: loan.amount_outstanding,
          amountPaid: loan.amount_paid,
          status: loan.status,
          createdAt: loan.createdAt,
        })),
        recentTransactions: recentTransactions.map((tx) => ({
          id: tx._id,
          type: tx.type,
          amount: tx.amount,
          balanceBefore: tx.balance_before,
          balanceAfter: tx.balance_after,
          description: tx.description,
          status: tx.status,
          reference: tx.reference,
          createdAt: (tx as any).createdAt,
        })),
        recentPurchases: purchases.map((p) => ({
          id: (p as any)._id,
          weightKg: p.weightKg,
          totalAmount: p.totalAmount,
          status: p.status,
          paymentStatus: p.paymentStatus,
          createdAt: (p as any).createdAt,
          walletTransactionId: p.walletTransactionId,
          loanDeductionAmount: p.loanDeductionAmount,
          netAmountCredited: p.netAmountCredited,
        })),
      };
    } catch (error) {
      console.error('Failed to get farmer financial status:', error);
      throw new BadRequestException(
        `Failed to get farmer financial status: ${error.message}`,
      );
    }
  }

  async updatePurchaseStatus(id: string, status: string): Promise<Purchase> {
    const purchase = await this.purchasesRepository.updateStatus(id, status);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }
    return purchase;
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: string,
  ): Promise<Purchase> {
    const purchase = await this.purchasesRepository.updatePaymentStatus(
      id,
      paymentStatus,
    );
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }
    return purchase;
  }
}
