import { Injectable, Logger } from '@nestjs/common';
import { SmsQueueService } from './sms-queue.service';

export interface SendSmsOptions {
  to: string; // Phone number with country code (+234...)
  message: string;
  messageType:
    | 'registration'
    | 'listing_created'
    | 'offer_received'
    | 'offer_sent'
    | 'offer_accepted'
    | 'payment_confirmed'
    | 'delivery_confirmed'
    | 'loan_approved'
    | 'withdrawal_processed'
    | 'salary_payment'
    | 'market_update';
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly ussdCode = process.env.USSD_CODE || '*347*2277#';

  constructor(private readonly smsQueueService: SmsQueueService) {}

  /**
   * Queue SMS for background processing
   * This ensures the calling function doesn't wait for SMS to be sent
   *
   * @param options - SMS options
   * @returns Job ID (returns immediately, SMS sent in background)
   */
  async sendSms(options: SendSmsOptions): Promise<string> {
    const { to, message, messageType } = options;

    this.logger.log(`Queueing ${messageType} SMS to ${to}`);

    try {
      // Queue the SMS job (non-blocking)
      const jobId = await this.smsQueueService.queueSms(
        to,
        message,
        messageType,
      );

      this.logger.log(`SMS queued successfully: ${jobId}`);

      return jobId;
    } catch (error) {
      this.logger.error(
        `Failed to queue SMS: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Return a failure indicator but don't throw
      // This ensures registration completes even if queueing fails
      return 'FAILED_TO_QUEUE';
    }
  }

  /**
   * Send welcome SMS to new farmer (queued in background)
   *
   * @param firstName - Farmer's first name
   * @param phone - Phone number with country code
   */
  async sendFarmerWelcomeSms(firstName: string, phone: string): Promise<void> {
    const message =
      `Dear ${firstName},\n\n` +
      `Welcome to FarmConnect! Sell your cassava directly to buyers.\n\n` +
      `Dial ${this.ussdCode} to list your cassava.\n\n` +
      `Support: 0816 XXX XXXX`;

    // Queue SMS (non-blocking)
    void this.sendSms({ to: phone, message, messageType: 'registration' });
  }

  /**
   * Send welcome SMS to new buyer (queued in background)
   *
   * @param firstName - Buyer's first name
   * @param phone - Phone number with country code
   */
  async sendBuyerWelcomeSms(firstName: string, phone: string): Promise<void> {
    const message =
      `Dear ${firstName},\n\n` +
      `Welcome to FarmConnect! Find quality cassava from verified farmers.\n\n` +
      `Dial ${this.ussdCode} to search for cassava.\n\n` +
      `Support: 0816 XXX XXXX`;

    // Queue SMS (non-blocking)
    void this.sendSms({ to: phone, message, messageType: 'registration' });
  }

  /**
   * Send PIN change confirmation SMS (queued in background)
   *
   * @param firstName - User's first name
   * @param phone - Phone number with country code
   */
  async sendPinChangeSms(firstName: string, phone: string): Promise<void> {
    const message =
      `Dear ${firstName},\n\n` +
      `Your PIN has been changed successfully.\n\n` +
      `If you didn't make this change, call 0816 XXX XXXX immediately.`;

    // Queue SMS (non-blocking)
    void this.sendSms({ to: phone, message, messageType: 'market_update' });
  }

  /**
   * Send listing created notification to farmer (queued in background)
   *
   * @param firstName - Farmer's first name
   * @param phone - Phone number with country code
   * @param listingRef - Listing reference number
   */
  async sendListingCreatedSms(
    firstName: string,
    phone: string,
    listingRef: string,
  ): Promise<void> {
    const message =
      `Dear ${firstName},\n\n` +
      `Your cassava listing #${listingRef} has been created.\n\n` +
      `Buyers will contact you soon!`;

    // Queue SMS (non-blocking)
    void this.sendSms({
      to: phone,
      message,
      messageType: 'listing_created',
    });
  }

  /**
   * Send offer notification to farmer (queued in background)
   *
   * @param firstName - Farmer's first name
   * @param phone - Phone number with country code
   * @param buyerName - Buyer's name
   * @param quantity - Quantity in kg
   * @param price - Price per kg
   */
  async sendOfferNotificationSms(
    firstName: string,
    phone: string,
    buyerName: string,
    quantity: number,
    price: number,
  ): Promise<void> {
    const priceNaira = (price / 100).toFixed(2);
    const message =
      `Dear ${firstName},\n\n` +
      `New offer from ${buyerName}:\n` +
      `${quantity}kg @ ₦${priceNaira}/kg\n\n` +
      `Dial ${this.ussdCode} to accept/reject`;

    // Queue SMS (non-blocking)
    void this.sendSms({
      to: phone,
      message,
      messageType: 'offer_received',
    });
  }

  /**
   * Send wallet created notification (queued in background)
   *
   * @param firstName - User's first name
   * @param phone - Phone number with country code
   * @param userType - Type of user
   */
  async sendWalletCreatedSms(
    firstName: string,
    phone: string,
    userType: 'farmer' | 'buyer',
  ): Promise<void> {
    const message =
      `Dear ${firstName},\n\n` +
      `Your FarmConnect wallet has been created successfully!\n\n` +
      `Check your balance: ${this.ussdCode}*4\n\n` +
      `Happy ${userType === 'farmer' ? 'selling' : 'buying'}!`;

    // Queue SMS (non-blocking)
    void this.sendSms({
      to: phone,
      message,
      messageType: 'registration',
    });
  }

  /**
   * Send loan approval SMS to user (farmer or staff)
   * @param details - Loan details (object with keys: name, phone, reference, amount, pickupDate, pickupLocation, monthlyPayment, notes)
   */
  async sendLoanApprovalSms(details: {
    name: string;
    phone: string;
    reference: string;
    amount: number;
    pickupDate: Date;
    pickupLocation?: string;
    monthlyPayment: number;
    notes?: string;
  }): Promise<void> {
    const pickupDateStr = details.pickupDate.toLocaleDateString('en-GB');
    const pickupTimeStr = details.pickupDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    let message = `Dear ${details.name}, your loan (${details.reference}) has been APPROVED!\n`;
    message += `Amount: ₦${(details.amount / 100).toLocaleString()}.\n`;
    message += `Pickup: ${pickupDateStr} ${pickupTimeStr}.`;
    if (details.pickupLocation)
      message += ` Location: ${details.pickupLocation}.`;
    message += `\nMonthly: ₦${(details.monthlyPayment / 100).toLocaleString()}.`;
    if (details.notes) message += `\nNote: ${details.notes}`;
    message += `\nDial *347*2277# for more info.`;
    await this.sendSms({
      to: details.phone,
      message,
      messageType: 'loan_approved',
    });
  }

  /**
   * Send salary payment notification SMS to staff (queued in background)
   *
   * @param firstName - Staff's first name
   * @param phone - Phone number with country code
   * @param details - Payment details
   */
  async sendSalaryPaymentSms(
    firstName: string,
    phone: string,
    details: {
      periodLabel: string;
      creditedAmount: number;
      pensionAmount: number;
      savingsAmount?: number;
    },
  ): Promise<void> {
    const creditedNaira = (details.creditedAmount / 100).toFixed(2);
    const pensionNaira = (details.pensionAmount / 100).toFixed(2);
    const savingsNaira = details.savingsAmount 
      ? (details.savingsAmount / 100).toFixed(2) 
      : '0.00';

    let message = `Dear ${firstName},\n\n`;
    message += `Your ${details.periodLabel} salary has been paid!\n\n`;
    message += `Credited: ₦${creditedNaira}\n`;
    message += `Pension: ₦${pensionNaira}\n`;
    if (parseFloat(savingsNaira) > 0) {
      message += `Savings: ₦${savingsNaira}\n`;
    }
    message += `\nCheck balance: ${this.ussdCode}*4\n`;
    message += `Thank you for your service!`;

    // Queue SMS (non-blocking)
    void this.sendSms({
      to: phone,
      message,
      messageType: 'salary_payment',
    });
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.smsQueueService.getQueueStats();
  }
}
