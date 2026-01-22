import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayrollService } from './payroll.service';

@Injectable()
export class PayrollCronService {
  private readonly logger = new Logger(PayrollCronService.name);

  constructor(private readonly payrollService: PayrollService) {}

  /**
   * Automated monthly payroll processing
   * Runs on the last day of every month at 9:00 AM
   *
   * Cron format: 0 9 28-31 * *
   * - 0: At minute 0
   * - 9: At 9:00 AM
   * - 28-31: On days 28-31 (ensures it runs on last day of any month)
   * - *: Every month
   * - *: Every day of the week
   */
  @Cron('0 9 28-31 * *', {
    name: 'monthly-payroll',
    timeZone: 'Africa/Lagos', // West Africa Time (WAT)
  })
  async handleMonthlyPayroll() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the first day of next month
    // If yes, then today is the last day of this month
    if (tomorrow.getDate() === 1) {
      this.logger.log(
        '🔔 Monthly payroll cron job triggered - Last day of month detected',
      );

      try {
        // Calculate payroll period (first day to last day of current month)
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        const lastDayOfMonth = today;

        this.logger.log(
          `Creating payroll for period: ${firstDayOfMonth.toISOString()} to ${lastDayOfMonth.toISOString()}`,
        );

        // Create payroll (this will create all transactions)
        const payroll = await this.payrollService.createPayroll(
          firstDayOfMonth,
          lastDayOfMonth,
          undefined, // No admin initiator for automated payroll
          'Automated monthly payroll',
        );

        this.logger.log(
          `✅ Payroll created: ${payroll._id} for ${payroll.period_label}`,
        );

        // Process payroll immediately
        this.logger.log(`Processing payroll ${payroll._id}...`);
        const result = await this.payrollService.processPayroll(payroll._id);

        if (result.success) {
          this.logger.log(
            `✅ Payroll processing completed successfully. Processed: ${result.processed}, Failed: ${result.failed}`,
          );
        } else {
          this.logger.error(
            `⚠️ Payroll processing completed with errors. Processed: ${result.processed}, Failed: ${result.failed}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ Automated payroll processing failed: ${error.message}`,
          error.stack,
        );

        // TODO: Send alert notification to admin
        // await this.notificationService.sendPayrollFailureAlert(error.message);
      }
    } else {
      this.logger.log(
        'Cron job triggered but not the last day of month - skipping',
      );
    }
  }

  /**
   * Manual trigger for testing payroll cron (for development only)
   * Uncomment and use this method for testing
   */
  // async testPayrollCron() {
  //   this.logger.log('🧪 Testing payroll cron manually...');
  //   await this.handleMonthlyPayroll();
  // }
}
