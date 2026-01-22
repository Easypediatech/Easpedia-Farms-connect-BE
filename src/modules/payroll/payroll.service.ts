import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { PayrollRepository } from './payroll.repository';
import { StaffRepository } from '../staff/staff.repository';
import { WalletService } from '../wallet/wallet.service';
import { SavingsService } from '../wallet/savings.service';
import { SettingsService } from '../settings/settings.service'; // adjust path if needed
import { SmsService } from '../../common/services/sms.service';

import { PayrollDocument, PayrollTransactionDocument } from '../../schemas';
import { Loan, LoanDocument } from '../../schemas/loan.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  // Pension contribution rates (Nigerian standard)
  private readonly EMPLOYEE_PENSION_RATE = 0.08; // 8%
  private readonly EMPLOYER_PENSION_RATE = 0.1; // 10%

  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly staffRepository: StaffRepository,
    private readonly walletService: WalletService,
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly savingsService: SavingsService,
    private readonly settingsService: SettingsService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Create a new payroll period
   */
  async createPayroll(
    periodStart: Date,
    periodEnd: Date,
    initiatedBy?: Types.ObjectId,
    notes?: string,
  ): Promise<PayrollDocument> {
    const periodLabel = this.generatePeriodLabel(periodStart, periodEnd);

    // Check if payroll already exists for this period
    const existing =
      await this.payrollRepository.findPayrollByPeriodLabel(periodLabel);
    if (existing) {
      throw new BadRequestException(
        `Payroll for period ${periodLabel} already exists with ID: ${existing._id}`,
      );
    }

    // Get all active and approved staff
    const { staff: activeStaff } = await this.staffRepository.findAllStaff({
      page: 1,
      limit: 1000,
      is_approved: true,
      status: 'active',
    });

    if (!activeStaff || activeStaff.length === 0) {
      throw new BadRequestException(
        'No active staff members found for payroll processing',
      );
    }

    // Get current tax rate from settings (defensive)
    let taxRate = 0;
    try {
      if (
        this.settingsService &&
        typeof this.settingsService.getSettings === 'function'
      ) {
        const settings = await this.settingsService.getSettings();
        taxRate = typeof settings?.taxRate === 'number' ? settings.taxRate : 0;
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch taxRate from settings, defaulting to 0. Error: ${err?.message}`,
      );
      taxRate = 0;
    }

    // Calculate totals
    let totalGross = 0;
    let totalPensionEmployee = 0;
    let totalPensionEmployer = 0;
    let totalCredited = 0; // Total credited salary (what actually gets paid out)

    const transactions: any[] = [];

    for (const staffItem of activeStaff) {
      // Fetch savings percentage for staff
      let savingsPercentage = 0;
      try {
        // savingsService.getByUserId should accept Types.ObjectId | string ideally.
        // Cast here defensively in case user_id is Schema.Types.ObjectId
        const savingsAccount = await this.savingsService.getByUserId(
          staffItem.staff.user_id as unknown as Types.ObjectId,
        );

        if (
          savingsAccount &&
          typeof savingsAccount.savings_percentage === 'number'
        ) {
          savingsPercentage = savingsAccount.savings_percentage;
        }
      } catch (e) {
        // Ignore errors, default to 0
        this.logger.debug(
          `Failed to fetch savings for user ${String(
            staffItem.staff?.user_id,
          )}: ${e?.message}`,
        );
      }

      const calculations = this.calculatePayrollDeductions(
        staffItem.staff.monthly_salary,
        savingsPercentage,
        taxRate,
      );

      totalGross += calculations.gross_salary;
      totalPensionEmployee += calculations.pension_employee_contribution;
      totalPensionEmployer += calculations.pension_employer_contribution;
      totalCredited += calculations.credited_salary;

      // Prepare transaction (will be created after payroll)
      transactions.push({
        staff_id: staffItem.staff._id,
        user_id: staffItem.staff.user_id,
        employee_id: staffItem.staff.employee_id,
        staff_name:
          `${staffItem.staff.first_name ?? ''} ${staffItem.staff.last_name ?? ''}`.trim(),
        department: staffItem.staff.department,
        role: staffItem.staff.role,
        ...calculations,
        status: 'pending',
      });
    }

    // NOTE: totalNet calculation can be refined (e.g., sum of credited_salary).
    const totalNet = totalGross - totalPensionEmployee;

    // Create payroll
    const payroll = await this.payrollRepository.createPayroll({
      period_start: periodStart,
      period_end: periodEnd,
      period_label: periodLabel,
      status: 'pending',
      total_staff_count: activeStaff.length,
      processed_count: 0,
      failed_count: 0,
      total_gross_amount: totalGross,
      total_net_amount: totalCredited, // Use actual credited amount for better tracking
      total_pension_employee: totalPensionEmployee,
      total_pension_employer: totalPensionEmployer,
      total_tax_deducted: 0,
      total_other_deductions: 0,
      initiated_by: initiatedBy as any,
      is_automated: !initiatedBy,
      notes,
    });

    // Create all payroll transactions
    const transactionsWithPayrollId = transactions.map((t) => ({
      ...t,
      payroll_id: payroll._id,
    }));

    await this.payrollRepository.bulkCreatePayrollTransactions(
      transactionsWithPayrollId,
    );

    this.logger.log(
      `Payroll created for ${periodLabel} with ${activeStaff.length} staff members. Total credited: ₦${(
        totalCredited / 100
      ).toFixed(2)}`,
    );

    return payroll;
  }

  /**
   * Process payroll - disburse salaries to staff wallets
   */
  async processPayroll(payrollId: string | Types.ObjectId): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    message: string;
  }> {
    const payroll = await this.payrollRepository.findPayrollById(payrollId);
    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.status === 'completed') {
      throw new BadRequestException('Payroll has already been processed');
    }

    if (payroll.status === 'processing') {
      throw new BadRequestException('Payroll is already being processed');
    }

    // Update status to processing
    await this.payrollRepository.updatePayrollStatus(payrollId, 'processing');

    this.logger.log(`Starting payroll processing for ${payroll.period_label}`);

    let processedCount = 0;
    let failedCount = 0;

    try {
      // Get organization wallet
      const organizationWallet =
        await this.walletService.getOrganizationWallet();
      if (!organizationWallet) {
        throw new BadRequestException(
          'Organization salary wallet not found. Please create one first.',
        );
      }

      // Check if organization wallet has sufficient funds
      if (organizationWallet.balance < payroll.total_net_amount) {
        throw new BadRequestException(
          `Insufficient funds in organization wallet. Required: ₦${(
            payroll.total_net_amount / 100
          ).toFixed(2)}, Available: ₦${(
            organizationWallet.balance / 100
          ).toFixed(2)}`,
        );
      }

      // Get all pending transactions
      const pendingTransactions =
        await this.payrollRepository.findPendingTransactionsByPayrollId(
          payrollId,
        );

      this.logger.log(
        `Processing ${pendingTransactions.length} pending transactions`,
      );

      // Process each transaction
      for (const transaction of pendingTransactions) {
        try {
          await this.processPayrollTransaction(
            transaction,
            organizationWallet._id,
          );
          processedCount++;
          await this.payrollRepository.incrementProcessedCount(payrollId);
        } catch (error) {
          failedCount++;
          await this.payrollRepository.incrementFailedCount(payrollId);
          await this.payrollRepository.addErrorLog(
            payrollId,
            `Failed for ${transaction.staff_name}: ${error?.message ?? error}`,
          );

          // Update transaction as failed
          await this.payrollRepository.updateTransactionStatus(
            transaction._id,
            'failed',
            {
              failed_reason: error?.message ?? String(error),
            },
          );

          this.logger.error(
            `Failed to process payroll for ${transaction.staff_name}: ${
              error?.message ?? String(error)
            }`,
          );
        }
      }

      // Update payroll status (completed regardless, record counts)
      await this.payrollRepository.updatePayrollStatus(payrollId, 'completed', {
        processed_at: new Date(),
        processed_count: processedCount,
        failed_count: failedCount,
      });

      const message =
        failedCount === 0
          ? `Payroll processed successfully. ${processedCount} staff members paid.`
          : `Payroll completed with ${failedCount} failures. ${processedCount} staff members paid.`;

      this.logger.log(message);

      return {
        success: failedCount === 0,
        processed: processedCount,
        failed: failedCount,
        message,
      };
    } catch (error) {
      // Mark payroll as failed
      await this.payrollRepository.updatePayrollStatus(payrollId, 'failed', {
        failed_reason: error?.message ?? String(error),
      });

      this.logger.error(
        `Payroll processing failed: ${error?.message ?? error}`,
      );
      throw new InternalServerErrorException(
        `Payroll processing failed: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * Process individual payroll transaction
   */
  private async processPayrollTransaction(
    transaction: PayrollTransactionDocument,
    organizationWalletId: Types.ObjectId,
  ): Promise<void> {
    // Update transaction status to processing
    await this.payrollRepository.updateTransactionStatus(
      transaction._id,
      'processing',
    );

    try {
      // Get staff wallet
      const staffWallet = await this.walletService.getWallet(
        transaction.user_id as any,
      );
      if (!staffWallet) {
        throw new Error('Staff wallet not found');
      }

      // Check for defaulted staff loans (past due date)
      const currentDate = new Date();
      const defaultedLoan = await this.loanModel
        .findOne({
          user_id: transaction.user_id,
          status: { $in: ['approved', 'active', 'defaulted'] },
          amount_outstanding: { $gt: 0 },
          due_date: { $lt: currentDate }, // Only deduct if loan has passed due date
        })
        .sort({ createdAt: -1 }); // Get most recent defaulted loan

      let loanDeductionAmount = 0;
      let loanDeductionTransactionId: string | undefined;
      let netAmountToCredit = transaction.credited_salary;

      // Process loan deduction if defaulted loan exists
      if (defaultedLoan && defaultedLoan.amount_outstanding > 0) {
        loanDeductionAmount = Math.min(
          transaction.credited_salary,
          defaultedLoan.amount_outstanding,
        );

        this.logger.log(
          `Defaulted loan found for ${transaction.staff_name} (past due date):`,
          {
            loanId: defaultedLoan._id,
            amountOutstanding: defaultedLoan.amount_outstanding,
            loanDeductionAmount,
            creditedSalary: transaction.credited_salary,
            dueDate: defaultedLoan.due_date,
            currentDate,
          },
        );

        try {
          // Create loan payment transaction
          const loanPaymentTransaction = await this.transactionModel.create({
            user_id: transaction.user_id,
            user_type: 'staff',
            type: 'loan_repayment',
            amount: loanDeductionAmount,
            balance_before: staffWallet.balance,
            balance_after: staffWallet.balance, // Wallet balance doesn't change for loan payment
            description: `Loan payment deducted from salary (Payroll Transaction ID: ${transaction._id})`,
            status: 'completed',
            reference: `LOAN_DEDUCT_PAYROLL_${transaction._id}_${Date.now()}`,
            loan_id: defaultedLoan._id,
            completed_at: new Date(),
          });

          loanDeductionTransactionId = loanPaymentTransaction._id.toString();
          this.logger.log(
            `Loan payment transaction created: ${loanDeductionTransactionId}`,
          );

          // Update loan outstanding amount
          const previousOutstanding = defaultedLoan.amount_outstanding;
          const previousPaid = defaultedLoan.amount_paid;

          defaultedLoan.amount_outstanding -= loanDeductionAmount;
          defaultedLoan.amount_paid += loanDeductionAmount;

          if (defaultedLoan.amount_outstanding === 0) {
            defaultedLoan.status = 'completed';
            defaultedLoan.completed_at = new Date();
            this.logger.log(
              `Loan fully paid and marked as completed for ${transaction.staff_name}`,
            );
          }

          await defaultedLoan.save();
          this.logger.log(`Loan updated for ${transaction.staff_name}:`, {
            loanId: defaultedLoan._id,
            previousOutstanding,
            newOutstanding: defaultedLoan.amount_outstanding,
            previousPaid,
            newPaid: defaultedLoan.amount_paid,
            status: defaultedLoan.status,
          });

          // Calculate remaining amount to credit to wallet
          netAmountToCredit = transaction.credited_salary - loanDeductionAmount;
          this.logger.log(
            `Net amount to credit after loan deduction for ${transaction.staff_name}: ₦${(netAmountToCredit / 100).toFixed(2)}`,
          );
        } catch (loanError) {
          this.logger.error(
            `Loan deduction failed for ${transaction.staff_name}:`,
            {
              error: loanError.message,
              stack: loanError.stack,
              userId: transaction.user_id,
              loanId: defaultedLoan._id,
              loanDeductionAmount,
            },
          );
          // Continue with full salary payment if loan deduction fails
          netAmountToCredit = transaction.credited_salary;
        }
      } else {
        this.logger.log(
          `No defaulted loans found for ${transaction.staff_name} (no loans past due date)`,
        );
      }

      // Transfer net amount (after loan deduction if any) from organization wallet to staff wallet
      if (netAmountToCredit > 0) {
        await this.walletService.transferFunds(
          organizationWalletId,
          staffWallet._id,
          netAmountToCredit,
          'organization',
          'staff',
          `Salary payment for ${transaction.staff_name} - ${transaction.payroll_id}${loanDeductionAmount > 0 ? ` (Loan deducted: ₦${(loanDeductionAmount / 100).toFixed(2)})` : ''}`,
        );
      }

      // If there's a savings deduction, transfer it to staff savings account
      if (transaction.savings_deduction && transaction.savings_deduction > 0) {
        try {
          await this.walletService.depositToSavings(
            transaction.user_id,
            transaction.savings_deduction,
          );
          this.logger.log(
            `Savings deduction processed for ${transaction.staff_name}: ₦${(
              transaction.savings_deduction / 100
            ).toFixed(2)}`,
          );
        } catch (savingsError) {
          this.logger.error(
            `Failed to process savings for ${transaction.staff_name}: ${savingsError?.message}`,
          );
          // Continue processing as salary payment was successful
        }
      }

      // Add pension contributions to staff pension balance
      // (employee contribution + employer contribution)
      await this.walletService.addToPension(
        transaction.user_id,
        transaction.total_pension_contribution,
      );

      // Update staff pension contributions in staff profile
      await this.staffRepository.updateStaffPensionContributions(
        transaction.staff_id as any,
        transaction.total_pension_contribution,
      );

      // Update transaction as completed
      await this.payrollRepository.updateTransactionStatus(
        transaction._id,
        'completed',
        {
          paid_at: new Date(),
          staff_wallet_id: staffWallet._id as any,
          organization_wallet_id: organizationWalletId as any,
          payment_reference: `PAY-${transaction._id}-${Date.now()}`,
        },
      );

      this.logger.log(
        `Successfully processed payroll for ${transaction.staff_name}: ` +
          `Credited ₦${(netAmountToCredit / 100).toFixed(2)}, ` +
          `Savings ₦${(transaction.savings_deduction / 100).toFixed(2)}, ` +
          `Pension ₦${(transaction.total_pension_contribution / 100).toFixed(2)}` +
          `${loanDeductionAmount > 0 ? `, Loan Deduction ₦${(loanDeductionAmount / 100).toFixed(2)}` : ''}`,
      );

      // Send SMS notification to staff about salary payment
      try {
        await this.sendPayrollSmsNotification(transaction);
      } catch (smsError) {
        this.logger.warn(
          `Failed to send payroll SMS to ${transaction.staff_name}: ${(smsError as Error).message}`,
        );
        // Don't fail the transaction if SMS fails
      }
    } catch (error) {
      this.logger.error(
        `Transaction processing failed: ${error?.message ?? error}`,
      );
      throw error;
    }
  }

  /**
   * Send SMS notification to staff about successful salary payment
   */
  private async sendPayrollSmsNotification(
    transaction: PayrollTransactionDocument,
  ): Promise<void> {
    try {
      // Get staff details including phone number
      const staffData = await this.staffRepository.findStaffById(
        String(transaction.staff_id),
      );

      if (!staffData?.user?.phone) {
        this.logger.warn(
          `No phone number found for staff ${transaction.staff_name}`,
        );
        return;
      }

      const { staff, user } = staffData;

      // Send salary payment SMS notification
      await this.smsService.sendSalaryPaymentSms(staff.first_name, user.phone, {
        periodLabel: 'Monthly', // Default as payroll_period_label might not exist
        creditedAmount: transaction.credited_salary,
        pensionAmount: transaction.pension_employee_contribution,
        savingsAmount: transaction.savings_deduction,
      });

      this.logger.log(
        `Payroll SMS queued for ${staff.first_name} ${staff.last_name} (${user.phone})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payroll SMS notification: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Calculate payroll deductions for a given gross salary
   * - savingsPercentage: percentage (e.g., 5 for 5%)
   * - taxRate: percentage (e.g., 10 for 10%)
   */
  private calculatePayrollDeductions(
    grossSalary: number,
    savingsPercentage: number = 0,
    taxRate: number = 0,
  ): {
    gross_salary: number;
    pension_employee_contribution: number;
    pension_employer_contribution: number;
    total_pension_contribution: number;
    tax_deduction: number;
    other_deductions: number;
    total_deductions: number;
    net_salary: number;
    savings_deduction: number;
    credited_salary: number;
  } {
    const employeePension = Math.round(
      grossSalary * this.EMPLOYEE_PENSION_RATE,
    );
    const employerPension = Math.round(
      grossSalary * this.EMPLOYER_PENSION_RATE,
    );
    const totalPension = employeePension + employerPension;

    // Use dynamic tax rate from settings
    const taxDeduction =
      taxRate > 0 ? Math.round(grossSalary * (taxRate / 100)) : 0;

    const otherDeductions = 0;

    const totalDeductions = employeePension + taxDeduction + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    let savingsDeduction = 0;
    if (savingsPercentage && savingsPercentage > 0) {
      savingsDeduction = Math.round(netSalary * (savingsPercentage / 100));
    }
    const creditedSalary = Math.max(0, netSalary - savingsDeduction);

    return {
      gross_salary: grossSalary,
      pension_employee_contribution: employeePension,
      pension_employer_contribution: employerPension,
      total_pension_contribution: totalPension,
      tax_deduction: taxDeduction,
      other_deductions: otherDeductions,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      savings_deduction: savingsDeduction,
      credited_salary: creditedSalary,
    };
  }

  /**
   * Generate period label (e.g., "December 2025")
   */
  private generatePeriodLabel(periodStart: Date, periodEnd: Date): string {
    const month = periodStart.toLocaleString('en-US', { month: 'long' });
    const year = periodStart.getFullYear();
    return `${month} ${year}`;
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(
    payrollId: string | Types.ObjectId,
  ): Promise<PayrollDocument> {
    const payroll = await this.payrollRepository.findPayrollById(payrollId);
    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }
    return payroll;
  }

  /**
   * Get all payrolls with pagination
   */
  async getAllPayrolls(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{ payrolls: PayrollDocument[]; total: number; pages: number }> {
    const { payrolls, total } = await this.payrollRepository.findAllPayrolls(
      page,
      limit,
      status,
    );
    return {
      payrolls,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payroll transactions
   */
  async getPayrollTransactions(
    payrollId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<{
    transactions: PayrollTransactionDocument[];
    total: number;
    pages: number;
  }> {
    const { transactions, total } =
      await this.payrollRepository.findTransactionsByPayrollId(
        payrollId,
        page,
        limit,
        status,
      );

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get staff payroll history
   */
  async getStaffPayrollHistory(
    staffId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    transactions: PayrollTransactionDocument[];
    total: number;
    pages: number;
  }> {
    const { transactions, total } =
      await this.payrollRepository.findTransactionsByStaffId(
        staffId,
        page,
        limit,
      );

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all payroll transactions with filtering
   */
  async getAllPayrollTransactions(
    page: number = 1,
    limit: number = 50,
    status?: string,
    staffId?: string,
    payrollId?: string,
  ): Promise<{
    transactions: PayrollTransactionDocument[];
    total: number;
    pages: number;
  }> {
    const { transactions, total } =
      await this.payrollRepository.findAllPayrollTransactions(
        page,
        limit,
        status,
        staffId,
        payrollId,
      );

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Retry failed payroll transaction
   */
  async retryFailedTransaction(
    transactionId: string | Types.ObjectId,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const transaction =
      await this.payrollRepository.findTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Payroll transaction not found');
    }

    if (transaction.status !== 'failed') {
      throw new BadRequestException('Only failed transactions can be retried');
    }

    try {
      const organizationWallet =
        await this.walletService.getOrganizationWallet();
      if (!organizationWallet) {
        throw new BadRequestException('Organization wallet not found');
      }

      await this.processPayrollTransaction(transaction, organizationWallet._id);

      return {
        success: true,
        message: `Transaction retried successfully for ${transaction.staff_name}`,
      };
    } catch (error) {
      await this.payrollRepository.updateTransactionStatus(
        transaction._id,
        'failed',
        {
          failed_reason: error?.message ?? String(error),
          retry_count: (transaction.retry_count ?? 0) + 1,
        },
      );

      return {
        success: false,
        message: `Retry failed: ${error?.message ?? String(error)}`,
      };
    }
  }

  /**
   * Get payroll statistics
   */
  async getPayrollStatistics(payrollId: string | Types.ObjectId): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    return this.payrollRepository.getPayrollStatistics(payrollId);
  }
}
