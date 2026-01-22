import { Injectable, Logger } from '@nestjs/common';
import { FarmerService } from '../farmer/farmer.service';
import { BuyerService } from '../buyer/buyer.service';
import { StaffService } from '../staff/staff.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackService } from '../wallet/paystack.service';
import { LoanService } from '../loan/loan.service';
import { AdminService } from '../admin/admin.service';
import { DojahService } from '../dojah/dojah.service';
import { RegisterFarmerDto } from '../farmer/dto/register-farmer.dto';
import { RegisterBuyerDto } from '../buyer/dto/register-buyer.dto';
import { SmsService } from '../../common/services/sms.service';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import {
  normalizePhoneNumber,
  comparePin,
  isValidPin,
} from '../../common/utils/pin.util';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UssdSession,
  UssdSessionDocument,
} from '../../schemas/ussd-session.schema';
import { SavingsService } from '../wallet/savings.service';

export interface UssdRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;
  networkCode?: string; // Network code from Africa's Talking
}

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private readonly ussdCode = process.env.USSD_CODE || '*347*2277#';
  private readonly DOJAH_TIMEOUT = 6000; // 6 seconds max for Dojah API

  // In-memory session storage (fallback, but we'll use database)
  private sessions: Map<string, any> = new Map();

  /**
   * Wrapper to call Dojah with timeout protection
   */
  private async callDojahWithTimeout(
    phone: string,
  ): Promise<{ status: 'success' | 'error'; userRecord?: any; message?: string }> {
    try {
      const timeoutPromise = new Promise<{ status: 'error'; message: string }>(
        (resolve) =>
          setTimeout(
            () => resolve({ status: 'error', message: 'Dojah verification timeout' }),
            this.DOJAH_TIMEOUT,
          ),
      );

      const dojahPromise = this.dojahService.verifyPhoneNumber(phone);

      const result = await Promise.race([dojahPromise, timeoutPromise]);
      return result;
    } catch (error) {
      this.logger.warn(`Dojah call failed for ${phone}: ${error.message}`);
      return { status: 'error', message: 'Dojah verification failed' };
    }
  }

  constructor(
    private readonly farmerService: FarmerService,
    private readonly buyerService: BuyerService,
    private readonly staffService: StaffService,
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
    private readonly loanService: LoanService,
    private readonly adminService: AdminService,
    @InjectModel(UssdSession.name)
    private readonly ussdSessionModel: Model<UssdSessionDocument>,
    private readonly smsService: SmsService,
    private readonly savingsService: SavingsService,
    private readonly dojahService: DojahService,
  ) {}

  /**
   * Main USSD handler
   *
   * @param request - USSD request from Africa's Talking
   * @returns USSD response (CON or END)
   */
  async handleUssd(request: UssdRequest): Promise<string> {
    const { sessionId, phoneNumber, text, networkCode } = request;
    console.log('USSD Request Received:', request);

    this.logger.log(
      `USSD Request - Session: ${sessionId}, Phone: ${phoneNumber}, Text: ${text}, Network: ${networkCode || 'UNKNOWN'}`,
    );

    // Parse text input (x, y coordinates)
    const inputs = text.split('*');
    const x = inputs; // Array of all inputs
    const y = inputs.length; // Current level

    // Get or create session (check database first)
    const session = await this.getOrCreateSession(
      sessionId,
      phoneNumber,
      networkCode,
    );
    let response = '';

    try {
      // Check if user exists
      const { phone: normalizedPhone } = normalizePhoneNumber(phoneNumber);
      this.logger.log(
        `Phone normalization: ${phoneNumber} -> ${normalizedPhone}`,
      );
      const existingFarmer = await this.checkIfUserExists(normalizedPhone);
      this.logger.log(
        `User lookup result: ${existingFarmer ? 'Found' : 'Not found'} for phone: ${normalizedPhone}`,
      );

      // Track user if identified
      if (existingFarmer?.userId) {
        await this.setSessionUser(sessionId, existingFarmer.userId);
      }

      if (text === '' || x[y - 1] === '00') {
        // Main menu or back to main menu
        response = await this.showMainMenu(normalizedPhone, existingFarmer);
      } else {
        // Route based on user status and first input
        if (existingFarmer) {
          // Existing user - route based on user type
          if (existingFarmer.userType === 'staff') {
            response = await this.authenticatedStaffFlow(
              sessionId,
              session,
              normalizedPhone,
              existingFarmer,
              x,
              y,
            );
          } else {
            // Farmer or buyer - use farmer flow (for now)
            response = await this.authenticatedFarmerFlow(
              sessionId,
              session,
              normalizedPhone,
              existingFarmer,
              x,
              y,
            );
          }
        } else {
          // New user - registration flow
          if (x[0] === '1') {
            // Register as Farmer - pass original phoneNumber for Dojah, normalizedPhone for DB
            response = await this.farmerRegistrationFlow(
              sessionId,
              session,
              normalizedPhone,
              x,
              y,
              phoneNumber, // Pass original phone for Dojah verification
            );
          } else if (x[0] === '2') {
            // Register as Buyer - pass original phoneNumber for Dojah, normalizedPhone for DB
            response = await this.buyerRegistrationFlow(
              sessionId,
              session,
              normalizedPhone,
              x,
              y,
              phoneNumber, // Pass original phone for Dojah verification
            );
          } else if (x[0] === '3') {
            // Register as Staff - pass original phoneNumber for Dojah, normalizedPhone for DB
            response = await this.staffRegistrationFlow(
              sessionId,
              session,
              normalizedPhone,
              x,
              y,
              phoneNumber, // Pass original phone for Dojah verification
            );
          } else {
            response = `END Invalid option\n\nDial ${this.ussdCode} again`;
          }
        }
      }
    } catch (error) {
      this.logger.error(`USSD Error: ${error.message}`, error.stack);
      this.logger.error(
        `USSD Error Context - SessionId: ${sessionId}, Phone: ${phoneNumber}, Text: ${text}, Step: ${y}`,
      );
      response = 'END An error occurred\n\nPlease try again later';

      // Update session with error - fire and forget (don't block response)
      this.updateSessionError(sessionId, error.message)
        .catch(err => this.logger.error(`Background session error update failed: ${err.message}`));
    }

    this.logger.log(`USSD Response: ${response}`);

    // Don't await session updates - do them in background to prevent blocking the response
    // This is critical for USSD performance as Africa's Talking has strict timeouts
    try {
      if (response.startsWith('END')) {
        this.logger.log(`Ending session: ${sessionId}`);
        // Fire and forget - don't block response
        this.endSession(
          sessionId,
          this.determineActionFromResponse(response),
        ).catch(err => this.logger.error(`Background session end error: ${err.message}`));
        this.sessions.delete(sessionId); // Clean up memory cache
      } else {
        this.logger.log(
          `Updating session progress for: ${sessionId}, level: ${y}`,
        );
        const currentMenuName = this.getCurrentMenu(session, x, y);
        this.logger.log(`Current menu determined as: ${currentMenuName}`);
        // Fire and forget - don't block response
        this.updateSessionProgress(sessionId, y, currentMenuName)
          .catch(err => this.logger.error(`Background session update error: ${err.message}`));
      }
    } catch (sessionUpdateError) {
      this.logger.error(`Session update error: ${sessionUpdateError.message}`);
      // Don't fail the response, just log the session update error
    }

    this.logger.log(`USSD Response: ${response.substring(0, 100)}...`);
    return response;
  }

  /**
   * Check if user exists by phone (farmer, buyer, or staff)
   */
  private async checkIfUserExists(phone: string): Promise<any> {
    try {
      this.logger.log(`Looking up user with phone: ${phone}`);

      // First try farmer
      try {
        const farmer = await this.farmerService.getFarmerByPhone(phone);
        if (farmer) {
          this.logger.log(
            `Farmer found: ${farmer.firstName} (ID: ${farmer.id})`,
          );
          return { ...farmer, userType: 'farmer' };
        }
      } catch (error) {
        this.logger.debug(
          `Farmer lookup failed for ${phone}: ${error.message}`,
        );
      }

      // Then try buyer
      try {
        const buyer = await this.buyerService.getBuyerByPhone(phone);
        if (buyer) {
          this.logger.log(`Buyer found: ${buyer.firstName} (ID: ${buyer.id})`);
          return { ...buyer, userType: 'buyer' };
        }
      } catch (error) {
        this.logger.debug(`Buyer lookup failed for ${phone}: ${error.message}`);
      }

      // Finally try staff
      try {
        const staff = await this.staffService.getStaffByPhone(phone);
        if (staff) {
          this.logger.log(`Staff found: ${staff.firstName} (ID: ${staff.id})`);
          return { ...staff, userType: 'staff' };
        }
      } catch (error) {
        this.logger.debug(`Staff lookup failed for ${phone}: ${error.message}`);
      }

      this.logger.log(`No user found for phone: ${phone}`);
      return null;
    } catch (error) {
      this.logger.warn(
        `User lookup failed for phone ${phone}: ${error.message}`,
      );
      // For unexpected errors, return null to avoid breaking the flow
      this.logger.error(
        `Unexpected error during user lookup: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Show main menu (different for new vs existing users)
   */
  private async showMainMenu(
    phone: string,
    existingUser: any = null,
  ): Promise<string> {
    if (existingUser) {
      if (existingUser.userType === 'staff') {
        // Authenticated staff menu
        return (
          `CON Welcome back, ${existingUser.firstName}!\n\n` +
          '1. My Profile\n' +
          '2. Wallet\n' +
          '3. Request Loan\n' +
          '4. My Balance\n' +
          '5. Change PIN\n' +
          '6. Help & Support'
        );
      } else {
        // Authenticated farmer/buyer menu
        return (
          `CON Welcome back, ${existingUser.firstName}!\n\n` +
          '1. Wallet\n' +
          '2. List Product\n' +
          '3. Check Market Price\n' +
          '4. My Balance\n' +
          '5. Get Loan\n' +
          '6. Change PIN\n' +
          '7. Help & Support\n' +
          '8. Set Savings Percentage'
        );
      }
    } else {
      // New user menu
      return (
        'CON Welcome to FarmConnect\n\n' +
        '1. Register as Farmer\n' +
        '2. Register as Buyer\n' +
        '3. Register as Staff'
      );
    }
  }

  /**
   * Authenticated farmer flow
   */
  private async authenticatedFarmerFlow(
    sessionId: string,
    session: any,
    phone: string,
    farmer: any,
    x: string[],
    y: number,
  ): Promise<string> {
    const sessionData = session.data;

    // Main menu options
    if (y === 1) {
      const option = x[0];

      switch (option) {
        case '1':
          session.stage = 'wallet_menu';
          return 'CON Wallet\n\n1. Withdraw\n2. Set Account\n\n00. Main menu';

        case '2':
          return 'CON List Product\n\nComing soon!\n\n00. Main menu';

        case '3':
          // Check Market Price
          session.stage = 'market_price_menu';
          return await this.showMarketPrices(sessionData);

        case '4':
          // View Balance
          return await this.viewBalance(phone);

        case '5':
          // Get Loan - Show loan menu options
          session.stage = 'loan_menu';
          return (
            'CON Loans\n\n' +
            '1. View My Loans\n' +
            '2. View Loan Types\n' +
            '3. Apply for Loan\n\n' +
            '00. Main menu'
          );

        case '6':
          // Change PIN - Step 1
          session.stage = 'change_pin_current';
          return 'CON Change PIN\n\nEnter your current 4-digit PIN:\n\n00. Main menu';

        case '7':
          return (
            'END Help & Support\n\n' +
            'Call: 0800-FARMCONNECT\n' +
            'Email: support@farmconnect.com\n\n' +
            `Dial ${this.ussdCode} to return`
          );
        case '8':
          session.stage = 'set_savings_percentage';
          return 'CON Enter the percentage of your salary to save (e.g. 10 for 10%):\n\n00. Main menu';

        default:
          return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }
    // Set savings percentage flow for farmers
    if (session.stage === 'set_savings_percentage' && y === 2) {
      const percentStr = x[1];
      const percent = parseFloat(percentStr);
      
      // Validate percentage input
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return 'CON Invalid percentage. Enter a value between 0 and 100:\n\n00. Main menu';
      }

      // Determine user type (farmer or staff)
      const userId = farmer?.userId || session?.staffId;
      if (!userId) {
        this.logger.error('Unable to identify user for savings percentage');
        return 'END Unable to identify user. Please try again.';
      }

      try {
        // Determine user type for savings account
        const userType = farmer ? 'farmer' : 'staff';
        
        // Get or check existing savings account
        const savingsAccount = await this.savingsService.getByUserId(userId, userType);
        
        // Check if user can change savings percentage (6 month restriction)
        if (savingsAccount?.savings_percentage_set_at) {
          const lastSet = new Date(savingsAccount.savings_percentage_set_at);
          const now = new Date();
          const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
          if (now.getTime() - lastSet.getTime() < sixMonthsMs) {
            const nextAllowed = new Date(lastSet.getTime() + sixMonthsMs);
            return `END You can only change your savings percentage every 6 months.\n\nCurrent: ${savingsAccount.savings_percentage}%\nNext change: ${nextAllowed.toLocaleDateString()}`;
          }
        }

        // Set savings percentage (creates account if not exists)
        await this.savingsService.setSavingsPercentage(userId, percent, userType);
        
        this.logger.log(`Savings percentage set to ${percent}% for ${userType} ${userId}`);
        return `END Savings percentage set to ${percent}% successfully.\n\n${percent}% will be saved from each ${userType === 'farmer' ? 'purchase' : 'salary'} payment.`;
      } catch (error) {
        this.logger.error(`Failed to set savings percentage: ${error.message}`);
        return 'END Failed to set savings percentage.\n\nPlease try again later.';
      }
    }

    // Wallet menu flow
    if (session.stage === 'wallet_menu' && y === 2) {
      const walletOption = x[1];

      if (walletOption === '1') {
        // Withdraw option
        session.stage = 'withdraw_menu';
        try {
          const wallet = await this.walletService.getWallet(farmer.userId);

          if (wallet.account_number) {
            // User has saved account
            return (
              'CON Withdraw To:\n\n' +
              '1. Saved Account\n' +
              `   ${wallet.bank_name}\n` +
              `   ${wallet.account_number}\n\n` +
              '2. Different Account\n\n' +
              '00. Main menu'
            );
          } else {
            // No saved account
            session.stage = 'withdraw_select_bank';
            sessionData.withdrawPage = 1;
            sessionData.searchTerm = undefined;
            return await this.showBankList(
              sessionData.withdrawPage,
              sessionData.searchTerm,
            );
          }
        } catch (error) {
          this.logger.error(`Wallet fetch failed: ${(error as Error).message}`);
          return 'END Unable to load wallet\n\nPlease try again later';
        }
      } else if (walletOption === '2') {
        // Set Account option
        session.stage = 'set_account_select_bank';
        sessionData.setAccountPage = 1;
        sessionData.searchTerm = undefined;
        return await this.showBankList(
          sessionData.setAccountPage,
          sessionData.searchTerm,
        );
      } else {
        return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    // Withdrawal flow - Choose account type
    if (session.stage === 'withdraw_menu' && y === 3) {
      const accountChoice = x[2];

      if (accountChoice === '1') {
        // Withdraw to saved account
        session.stage = 'withdraw_amount_saved';
        return 'CON Enter amount to withdraw (₦):\n\n00. Main menu';
      } else if (accountChoice === '2') {
        // Withdraw to different account
        session.stage = 'withdraw_select_bank';
        sessionData.withdrawPage = 1;
        sessionData.searchTerm = undefined;
        return await this.showBankList(
          sessionData.withdrawPage,
          sessionData.searchTerm,
        );
      } else {
        return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    // Withdrawal to saved account - Enter amount
    if (session.stage === 'withdraw_amount_saved' && y === 4) {
      const amount = parseFloat(x[3]);

      if (isNaN(amount) || amount < 100) {
        return 'CON Minimum withdrawal is ₦100\n\nEnter amount:\n\n00. Main menu';
      }

      sessionData.withdrawAmount = amount;
      session.stage = 'withdraw_pin_saved';
      return 'CON Enter your 4-digit PIN to confirm:\n\n00. Main menu';
    }

    // Withdrawal to saved account - Verify PIN and process
    if (session.stage === 'withdraw_pin_saved' && y === 5) {
      const pin = x[4].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      // Verify PIN
      try {
        await this.farmerService.login({ phone, pin });

        // Process withdrawal
        const amountInKobo = Math.round(sessionData.withdrawAmount * 100);
        await this.walletService.withdrawFromWallet(
          farmer.userId,
          amountInKobo,
        );

        return (
          `END Withdrawal successful!\n\n` +
          `Amount: ₦${sessionData.withdrawAmount}\n\n` +
          `Funds will be transferred shortly.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(`Withdrawal failed: ${(error as Error).message}`);
        if ((error as Error).message.includes('PIN')) {
          return `END Incorrect PIN\n\nDial ${this.ussdCode} to try again`;
        }
        return `END Withdrawal failed\n\n${(error as Error).message}\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // Withdrawal to different account - Select bank
    if (session.stage === 'withdraw_select_bank') {
      const input = x[y - 1].trim();
      const bankSelection = parseInt(input);

      // Check if user wants to search
      if (input === '0' || input.toLowerCase() === 's') {
        session.stage = 'withdraw_search_bank';
        return (
          'CON Search Bank\n\n' +
          'Enter bank name:\n' +
          '(e.g., Access, GTB, Zenith)\n\n' +
          '00. Main menu'
        );
      }

      if (bankSelection === 6) {
        // Next page
        sessionData.withdrawPage += 1;
        return await this.showBankList(
          sessionData.withdrawPage,
          sessionData.searchTerm,
        );
      } else if (bankSelection === 7) {
        // Previous page
        sessionData.withdrawPage = Math.max(1, sessionData.withdrawPage - 1);
        return await this.showBankList(
          sessionData.withdrawPage,
          sessionData.searchTerm,
        );
      } else {
        const selectedBank = await this.getBankFromSelection(
          sessionData.withdrawPage,
          bankSelection,
          sessionData.searchTerm,
        );

        if (!selectedBank) {
          return `END Invalid bank selection\n\nDial ${this.ussdCode} to try again`;
        }

        sessionData.withdrawBank = selectedBank;
        session.stage = 'withdraw_account_number';
        return `CON ${selectedBank.name}\n\nEnter 10-digit account number:\n\n00. Main menu`;
      }
    }

    // Withdrawal - Search bank by name
    if (session.stage === 'withdraw_search_bank') {
      const searchTerm = x[y - 1].trim();

      if (!searchTerm || searchTerm.length < 2) {
        return (
          'CON Search term too short\n\n' +
          'Enter at least 2 characters:\n\n' +
          '00. Main menu'
        );
      }

      sessionData.searchTerm = searchTerm;
      sessionData.withdrawPage = 1;
      session.stage = 'withdraw_select_bank';

      const searchResults = await this.showBankList(
        sessionData.withdrawPage,
        searchTerm,
      );

      if (searchResults.includes('No banks found')) {
        sessionData.searchTerm = undefined;
        return (
          'CON No banks found\n\n' +
          'Press 0 to search again\n' +
          'Or select from list below:\n\n' +
          (await this.showBankList(1))
        );
      }

      return searchResults;
    }

    // Withdrawal - Enter account number
    if (session.stage === 'withdraw_account_number') {
      const accountNumber = x[y - 1].trim();

      if (!/^\d{10}$/.test(accountNumber)) {
        return 'CON Account number must be 10 digits\n\nTry again:\n\n00. Main menu';
      }

      sessionData.withdrawAccountNumber = accountNumber;
      session.stage = 'withdraw_amount_different';

      return (
        `CON ${sessionData.withdrawBank.name}\n` +
        `Account: ${accountNumber}\n\n` +
        `Enter amount to withdraw (₦):\n\n00. Main menu`
      );
    }

    // Withdrawal to different account - Enter amount
    if (session.stage === 'withdraw_amount_different') {
      const amount = parseFloat(x[y - 1]);

      if (isNaN(amount) || amount < 100) {
        return 'CON Minimum withdrawal is ₦100\n\nEnter amount:\n\n00. Main menu';
      }

      sessionData.withdrawAmount = amount;
      session.stage = 'withdraw_pin_different';
      return 'CON Enter your 4-digit PIN to confirm:\n\n00. Main menu';
    }

    // Withdrawal to different account - Verify PIN and process
    if (session.stage === 'withdraw_pin_different') {
      const pin = x[y - 1].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      // Verify PIN
      try {
        await this.farmerService.login({ phone, pin });

        // Process withdrawal
        const amountInKobo = Math.round(sessionData.withdrawAmount * 100);
        await this.walletService.withdrawFromWallet(
          farmer.userId,
          amountInKobo,
          {
            bank_name: sessionData.withdrawBank.name,
            bank_code: sessionData.withdrawBank.code,
            account_number: sessionData.withdrawAccountNumber,
            account_name: sessionData.withdrawAccountName,
          },
        );

        return (
          `END Withdrawal successful!\n\n` +
          `Amount: ₦${sessionData.withdrawAmount}\n` +
          `To: ${sessionData.withdrawAccountName}\n` +
          `${sessionData.withdrawBank.name}\n\n` +
          `Funds will be transferred shortly.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(`Withdrawal failed: ${(error as Error).message}`);
        if ((error as Error).message.includes('PIN')) {
          return `END Incorrect PIN\n\nDial ${this.ussdCode} to try again`;
        }
        return `END Withdrawal failed\n\n${(error as Error).message}\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // Set account flow - Select bank
    if (session.stage === 'set_account_select_bank') {
      const input = x[y - 1].trim();
      const bankSelection = parseInt(input);

      // Check if user wants to search
      if (input === '0' || input.toLowerCase() === 's') {
        session.stage = 'set_account_search_bank';
        return (
          'CON Search Bank\n\n' +
          'Enter bank name:\n' +
          '(e.g., Access, GTB, Zenith)\n\n' +
          '00. Main menu'
        );
      }

      if (bankSelection === 6) {
        // Next page
        sessionData.setAccountPage += 1;
        return await this.showBankList(
          sessionData.setAccountPage,
          sessionData.setAccountSearchTerm,
        );
      } else if (bankSelection === 7) {
        // Previous page
        sessionData.setAccountPage = Math.max(
          1,
          sessionData.setAccountPage - 1,
        );
        return await this.showBankList(
          sessionData.setAccountPage,
          sessionData.setAccountSearchTerm,
        );
      } else {
        const selectedBank = await this.getBankFromSelection(
          sessionData.setAccountPage,
          bankSelection,
          sessionData.setAccountSearchTerm,
        );

        if (!selectedBank) {
          return `END Invalid bank selection\n\nDial ${this.ussdCode} to try again`;
        }

        sessionData.setAccountBank = selectedBank;
        session.stage = 'set_account_number';
        return `CON ${selectedBank.name}\n\nEnter 10-digit account number:\n\n00. Main menu`;
      }
    }

    // Set account - Search bank by name
    if (session.stage === 'set_account_search_bank') {
      const searchTerm = x[y - 1].trim();

      if (!searchTerm || searchTerm.length < 2) {
        return (
          'CON Search term too short\n\n' +
          'Enter at least 2 characters:\n\n' +
          '00. Main menu'
        );
      }

      sessionData.setAccountSearchTerm = searchTerm;
      sessionData.setAccountPage = 1;
      session.stage = 'set_account_select_bank';

      const searchResults = await this.showBankList(
        sessionData.setAccountPage,
        searchTerm,
      );

      if (searchResults.includes('No banks found')) {
        sessionData.setAccountSearchTerm = undefined;
        return (
          'CON No banks found\n\n' +
          'Press 0 to search again\n' +
          'Or select from list below:\n\n' +
          (await this.showBankList(1))
        );
      }

      return searchResults;
    }

    // Set account - Enter account number
    if (session.stage === 'set_account_number') {
      const accountNumber = x[y - 1].trim();

      if (!/^\d{10}$/.test(accountNumber)) {
        return 'CON Account number must be 10 digits\n\nTry again:\n\n00. Main menu';
      }

      sessionData.setAccountNumber = accountNumber;
      session.stage = 'set_account_pin';

      return (
        `CON Set Withdrawal Account\n\n` +
        `Bank: ${sessionData.setAccountBank.name}\n` +
        `Account: ${accountNumber}\n\n` +
        `Enter PIN to confirm:\n\n00. Main menu`
      );
    }

    // Set account - Verify PIN and save
    if (session.stage === 'set_account_pin') {
      const pin = x[y - 1].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      // Verify PIN
      try {
        await this.farmerService.login({ phone, pin });

        // Save account (will verify with Paystack internally)
        const updatedWallet = await this.walletService.setWithdrawalAccount(
          farmer.userId,
          {
            bank_name: sessionData.setAccountBank.name,
            bank_code: sessionData.setAccountBank.code,
            account_number: sessionData.setAccountNumber,
            account_name: 'Account Holder', // Placeholder, will be replaced with verified name
          },
        );

        return (
          `END Account set successfully!\n\n` +
          `Bank: ${sessionData.setAccountBank.name}\n` +
          `Account: ${sessionData.setAccountNumber}\n` +
          `Name: ${updatedWallet.account_name}\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(`Set account failed: ${(error as Error).message}`);
        if ((error as Error).message.includes('PIN')) {
          return `END Incorrect PIN\n\nDial ${this.ussdCode} to try again`;
        }
        return `END Failed to set account\n\n${(error as Error).message}\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // Change PIN flow
    if (session.stage === 'change_pin_current' && y === 2) {
      const currentPin = x[1].trim();

      if (!/^\d{4}$/.test(currentPin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      // Verify current PIN
      try {
        await this.farmerService.login({ phone, pin: currentPin });
        sessionData.currentPin = currentPin;
        session.stage = 'change_pin_new';
        return 'CON Enter your new 4-digit PIN:\n\n00. Main menu';
      } catch (error) {
        return `END Incorrect current PIN\n\nDial ${this.ussdCode} to try again`;
      }
    }

    if (session.stage === 'change_pin_new' && y === 3) {
      const newPin = x[2].trim();

      if (!/^\d{4}$/.test(newPin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      if (newPin === sessionData.currentPin) {
        return 'CON New PIN must be different\n\nTry again:\n\n00. Main menu';
      }

      sessionData.newPin = newPin;
      session.stage = 'change_pin_confirm';
      return 'CON Confirm your new 4-digit PIN:\n\n00. Main menu';
    }

    if (session.stage === 'change_pin_confirm' && y === 4) {
      const confirmPin = x[3].trim();

      if (confirmPin !== sessionData.newPin) {
        return `END PINs do not match\n\nDial ${this.ussdCode} to try again`;
      }

      // Change PIN
      try {
        await this.farmerService.changePin(phone, {
          currentPin: sessionData.currentPin,
          newPin: sessionData.newPin,
        });

        return (
          `END PIN changed successfully!\n\n` +
          `You will receive a confirmation SMS.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(`PIN change failed: ${error.message}`);
        return 'END PIN change failed\n\nPlease try again later';
      }
    }

    // Loan flow - Main loan menu
    if (session.stage === 'loan_menu' && y === 2) {
      const loanMenuOption = parseInt(x[1]);

      if (loanMenuOption === 1) {
        // View my current loans
        session.stage = 'view_current_loans';
        try {
          const loans = await this.loanService.getAllLoans({
            farmer_id: farmer.id,
            status: 'requested,approved,active',
            limit: 5,
            page: 1,
          });

          if (!loans || loans.loans.length === 0) {
            return (
              'END No Active Loans\n\n' +
              'You currently have no active loans.\n\n' +
              `Dial ${this.ussdCode} to apply for a loan`
            );
          }

          let response = 'END Your Current Loans\n\n';
          loans.loans.forEach((loan, index) => {
            response +=
              `${index + 1}. ${loan.loan_type_name}\n` +
              `   Status: ${loan.status}\n` +
              `   Amount: ₦${(loan.principal_amount / 100).toFixed(0)}\n` +
              `   Outstanding: ₦${(loan.amount_outstanding / 100).toFixed(0)}\n` +
              `   Due: ${new Date(loan.due_date).toLocaleDateString()}\n\n`;
          });

          response += `Dial ${this.ussdCode} to continue`;
          return response;
        } catch (error) {
          this.logger.error(`Failed to fetch loans: ${(error as Error).message}`);
          return (
            'END Error fetching loans\n\n' +
            'Please try again later.\n\n' +
            `Dial ${this.ussdCode} to continue`
          );
        }
      } else if (loanMenuOption === 2) {
        // View loan types
        session.stage = 'view_loan_types';
        return await this.showLoanTypes(sessionData);
      } else if (loanMenuOption === 3) {
        // Apply for new loan
        session.stage = 'apply_new_loan';
        return await this.showLoanTypes(sessionData);
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // View loan types (informational only)
    if (session.stage === 'view_loan_types' && y === 3) {
      const loanSelection = parseInt(x[2]);
      const loanTypes = sessionData.loanTypes || [];

      if (loanSelection > 0 && loanSelection <= loanTypes.length) {
        const selectedLoanType = loanTypes[loanSelection - 1];
        return (
          'END Loan Type Details\n\n' +
          `Type: ${selectedLoanType.name}\n` +
          `Description: ${selectedLoanType.description}\n` +
          `Interest Rate: ${selectedLoanType.interest_rate}%\n` +
          `Duration: ${selectedLoanType.duration_months} months\n\n` +
          `Dial ${this.ussdCode} to apply for this loan`
        );
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} again`;
      }
    }

    // Apply for new loan - select loan type
    if (session.stage === 'apply_new_loan' && y === 3) {
      const loanSelection = parseInt(x[2]);
      const loanTypes = sessionData.loanTypes || [];

      if (loanSelection > 0 && loanSelection <= loanTypes.length) {
        const selectedLoanType = loanTypes[loanSelection - 1];
        sessionData.selectedLoanType = selectedLoanType;
        session.stage = 'loan_confirm';

        return (
          `CON Loan Details\n\n` +
          `Type: ${selectedLoanType.name}\n` +
          `Interest: ${selectedLoanType.interest_rate}%\n` +
          `Duration: ${selectedLoanType.duration_months} months\n\n` +
          `1. Request Loan\n` +
          `2. Back\n\n00. Main menu`
        );
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} to try again`;
      }
    }

    if (session.stage === 'loan_confirm' && y === 4) {
      const confirmOption = x[3];

      if (confirmOption === '1') {
        // Request the loan
        session.stage = 'loan_purpose';
        return (
          'CON Enter purpose for loan:\n' +
          '(e.g., Buy fertilizer)\n\n' +
          'Or press # to skip\n\n00. Main menu'
        );
      } else if (confirmOption === '2') {
        // Go back to loan types
        session.stage = 'apply_new_loan';
        return await this.showLoanTypes(sessionData);
      } else {
        return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    if (session.stage === 'loan_purpose' && y === 5) {
      const purpose = x[4].trim();

      // Submit loan request
      try {
        const loanRequest = await this.loanService.createLoanRequest(
          farmer.id,
          {
            loan_type_id: sessionData.selectedLoanType.id,
            purpose: purpose === '#' || !purpose ? undefined : purpose,
          },
        );

        return (
          `END Loan Request Submitted!\n\n` +
          `Reference: ${loanRequest.reference}\n\n` +
          `Your loan request is being reviewed.\n` +
          `You will receive an SMS with pickup date.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(`Loan request failed: ${(error as Error).message}`);

        if ((error as Error).message.includes('active loan')) {
          return (
            `END Loan Request Failed\n\n` +
            `You already have an active loan.\n` +
            `Please repay your existing loan first.\n\n` +
            `Dial ${this.ussdCode} to continue`
          );
        }

        return (
          'END Loan Request Failed\n\n' +
          `${(error as Error).message}\n\n` +
          `Dial ${this.ussdCode} to try again`
        );
      }
    }

    // Market price flow
    if (session.stage === 'market_price_menu' && y >= 2) {
      const priceSelection = parseInt(x[y - 1]);

      // Get products from session data
      const products = sessionData.products || [];

      if (priceSelection > 0 && priceSelection <= products.length) {
        const selectedProduct = products[priceSelection - 1];
        return (
          'END Market Price\n\n' +
          `Product: ${selectedProduct.productName}\n` +
          `Size: ${selectedProduct.size}\n` +
          `Farmer Price: ₦${selectedProduct.priceForFarmers}\n` +
          `Market Price: ₦${selectedProduct.priceForMarket}\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} again`;
      }
    }

    return `END Invalid input\n\nDial ${this.ussdCode} again`;
  }

  /**
   * Authenticated staff flow
   */
  private async authenticatedStaffFlow(
    sessionId: string,
    session: any,
    phone: string,
    staff: any,
    x: string[],
    y: number,
  ): Promise<string> {
    const sessionData = session.data;

    // Main menu options
    if (y === 1) {
      const option = x[0];

      switch (option) {
        case '1':
          // My Profile
          return await this.viewStaffProfile(staff);

        case '2':
          // Wallet
          session.stage = 'staff_wallet_menu';
          return 'CON Wallet\n\n1. Withdraw\n2. Set Account\n\n00. Main menu';

        case '3':
          // Request Loan - Show staff loan menu options
          session.stage = 'staff_loan_menu';
          return (
            'CON Loans\n\n' +
            '1. View My Loans\n' +
            '2. View Loan Types\n' +
            '3. Apply for Loan\n\n' +
            '00. Main menu'
          );

        case '4':
          // My Balance
          return await this.viewStaffBalance(phone);

        case '5':
          // Change PIN
          session.stage = 'staff_change_pin_current';
          return 'CON Change PIN\n\nEnter your current 4-digit PIN:\n\n00. Main menu';

        case '6':
          // Help & Support
          return (
            'END Help & Support\n\n' +
            'Call: 0800-FARMCONNECT\n' +
            'Email: support@farmconnect.com\n\n' +
            `Dial ${this.ussdCode} to return`
          );

        default:
          return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    // Staff wallet menu
    if (session.stage === 'staff_wallet_menu' && y === 2) {
      const walletOption = x[1];

      if (walletOption === '1') {
        // Withdraw option
        session.stage = 'staff_withdraw_menu';
        try {
          const wallet = await this.walletService.getWallet(staff.userId);

          if (wallet.account_number) {
            // User has saved account
            return (
              'CON Withdraw To:\n\n' +
              '1. Saved Account\n' +
              `   ${wallet.bank_name}\n` +
              `   ${wallet.account_number}\n\n` +
              '2. Different Account\n\n' +
              '00. Main menu'
            );
          } else {
            // No saved account
            session.stage = 'staff_withdraw_select_bank';
            sessionData.staffWithdrawPage = 1;
            sessionData.searchTerm = undefined;
            return await this.showBankList(
              sessionData.staffWithdrawPage,
              sessionData.searchTerm,
            );
          }
        } catch (error) {
          this.logger.error(`Wallet fetch failed: ${(error as Error).message}`);
          return 'END Unable to load wallet\n\nPlease try again later';
        }
      } else if (walletOption === '2') {
        // Set Account option
        session.stage = 'staff_set_account_select_bank';
        sessionData.staffSetAccountPage = 1;
        sessionData.searchTerm = undefined;
        return await this.showBankList(
          sessionData.staffSetAccountPage,
          sessionData.searchTerm,
        );
      } else {
        return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    // Staff loan request flow - Main staff loan menu
    if (session.stage === 'staff_loan_menu' && y === 2) {
      const loanMenuOption = parseInt(x[1]);

      if (loanMenuOption === 1) {
        // View my current loans
        session.stage = 'staff_view_current_loans';
        try {
          const loans = await this.loanService.getAllLoans({
            staff_id: staff.id,
            status: 'requested,approved,active',
            limit: 5,
            page: 1,
          });

          if (!loans || loans.loans.length === 0) {
            return (
              'END No Active Loans\n\n' +
              'You currently have no active loans.\n\n' +
              `Dial ${this.ussdCode} to apply for a loan`
            );
          }

          let response = 'END Your Current Loans\n\n';
          loans.loans.forEach((loan, index) => {
            response +=
              `${index + 1}. ${loan.loan_type_name}\n` +
              `   Status: ${loan.status}\n` +
              `   Amount: ₦${(loan.principal_amount / 100).toFixed(0)}\n` +
              `   Outstanding: ₦${(loan.amount_outstanding / 100).toFixed(0)}\n` +
              `   Due: ${new Date(loan.due_date).toLocaleDateString()}\n\n`;
          });

          response += `Dial ${this.ussdCode} to continue`;
          return response;
        } catch (error) {
          this.logger.error(`Failed to fetch staff loans: ${(error as Error).message}`);
          return (
            'END Error fetching loans\n\n' +
            'Please try again later.\n\n' +
            `Dial ${this.ussdCode} to continue`
          );
        }
      } else if (loanMenuOption === 2) {
        // View loan types
        session.stage = 'staff_view_loan_types';
        return await this.showStaffLoanTypes(sessionData);
      } else if (loanMenuOption === 3) {
        // Apply for new loan
        session.stage = 'staff_apply_new_loan';
        return await this.showStaffLoanTypes(sessionData);
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // View staff loan types (informational only)
    if (session.stage === 'staff_view_loan_types' && y === 3) {
      const loanSelection = parseInt(x[2]);
      const loanTypes = sessionData.staffLoanTypes || [];

      if (loanSelection > 0 && loanSelection <= loanTypes.length) {
        const selectedLoanType = loanTypes[loanSelection - 1];
        return (
          'END Loan Type Details\n\n' +
          `Type: ${selectedLoanType.name}\n` +
          `Description: ${selectedLoanType.description}\n` +
          `Interest Rate: ${selectedLoanType.interest_rate}%\n` +
          `Duration: ${selectedLoanType.duration_months} months\n\n` +
          `Dial ${this.ussdCode} to apply for this loan`
        );
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} again`;
      }
    }

    // Apply for new staff loan - select loan type
    if (session.stage === 'staff_apply_new_loan' && y === 3) {
      const loanTypeSelection = parseInt(x[2]);
      const loanTypes = sessionData.staffLoanTypes || [];

      if (loanTypeSelection > 0 && loanTypeSelection <= loanTypes.length) {
        const selectedLoanType = loanTypes[loanTypeSelection - 1];
        sessionData.selectedStaffLoanType = selectedLoanType;
        session.stage = 'staff_loan_amount';
        return (
          `CON ${selectedLoanType.name}\n\n` +
          `Interest Rate: ${selectedLoanType.interest_rate}%\n` +
          `Duration: ${selectedLoanType.duration_months} months\n\n` +
          `Enter loan amount (₦):\n\n00. Main menu`
        );
      } else {
        return `END Invalid selection\n\nDial ${this.ussdCode} again`;
      }
    }

    // Staff loan amount input
    if (session.stage === 'staff_loan_amount' && y === 4) {
      const amount = parseFloat(x[3]);

      if (isNaN(amount) || amount <= 0) {
        return 'CON Invalid amount\n\nEnter loan amount (₦):\n\n00. Main menu';
      }

      // For staff loans, set a reasonable maximum (e.g., 10x monthly salary or fixed amount)
      // For now, allow any positive amount and let the backend validate
      sessionData.staffLoanAmount = amount;
      session.stage = 'staff_loan_purpose';
      return 'CON Loan Purpose (optional):\n\nEnter purpose or press # to skip:\n\n00. Main menu';
    }

    // Staff loan purpose and submission
    if (session.stage === 'staff_loan_purpose' && y === 5) {
      const purpose = x[4].trim();

      // Submit staff loan request
      try {
        const createLoanDto = {
          loanTypeId: sessionData.selectedStaffLoanType.id,
          principalAmount: sessionData.staffLoanAmount * 100, // Convert to kobo
          interestRate: sessionData.selectedStaffLoanType.interest_rate,
          purpose: purpose === '#' || !purpose ? 'Personal loan' : purpose,
          durationMonths: 6, // Default to 6 months for staff loans
        };

        const loanRequest = await this.staffService.requestStaffLoan(
          staff.id,
          createLoanDto,
        );

        return (
          `END Loan Request Submitted!\n\n` +
          `Reference: ${loanRequest.reference}\n\n` +
          `Your loan request is being reviewed.\n` +
          `You will receive an SMS notification.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(
          `Staff loan request failed: ${(error as Error).message}`,
        );

        if ((error as Error).message.includes('active loan')) {
          return (
            `END Loan Request Failed\n\n` +
            `You already have an active loan.\n` +
            `Please repay your existing loan first.\n\n` +
            `Dial ${this.ussdCode} to continue`
          );
        }

        return (
          'END Loan Request Failed\n\n' +
          `${(error as Error).message}\n\n` +
          `Dial ${this.ussdCode} to try again`
        );
      }
    }

    // Staff withdrawal flows (similar to farmer but with staff_ prefix)
    if (session.stage === 'staff_withdraw_menu' && y === 3) {
      const accountChoice = x[2];

      if (accountChoice === '1') {
        // Withdraw to saved account
        session.stage = 'staff_withdraw_amount_saved';
        return 'CON Enter amount to withdraw (₦):\n\n00. Main menu';
      } else if (accountChoice === '2') {
        // Withdraw to different account
        session.stage = 'staff_withdraw_select_bank';
        sessionData.staffWithdrawPage = 1;
        sessionData.searchTerm = undefined;
        return await this.showBankList(
          sessionData.staffWithdrawPage,
          sessionData.searchTerm,
        );
      } else {
        return `END Invalid option\n\nDial ${this.ussdCode} again`;
      }
    }

    // Staff withdrawal to saved account - Enter amount
    if (session.stage === 'staff_withdraw_amount_saved' && y === 4) {
      const amount = parseFloat(x[3]);

      if (isNaN(amount) || amount < 100) {
        return 'CON Minimum withdrawal is ₦100\n\nEnter amount:\n\n00. Main menu';
      }

      sessionData.staffWithdrawAmount = amount;
      session.stage = 'staff_withdraw_pin_saved';
      return 'CON Enter your 4-digit PIN to confirm:\n\n00. Main menu';
    }

    // Staff withdrawal to saved account - Verify PIN and process
    if (session.stage === 'staff_withdraw_pin_saved' && y === 5) {
      const pin = x[4].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      // Verify PIN
      try {
        await this.staffService.login({ phone, pin });

        // Process withdrawal
        const amountInKobo = Math.round(sessionData.staffWithdrawAmount * 100);
        await this.walletService.withdrawFromWallet(staff.userId, amountInKobo);

        return (
          `END Withdrawal successful!\n\n` +
          `Amount: ₦${sessionData.staffWithdrawAmount}\n\n` +
          `Funds will be transferred shortly.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(
          `Staff withdrawal failed: ${(error as Error).message}`,
        );
        if ((error as Error).message.includes('PIN')) {
          return `END Incorrect PIN\n\nDial ${this.ussdCode} to try again`;
        }
        return `END Withdrawal failed\n\n${(error as Error).message}\n\nDial ${this.ussdCode} to try again`;
      }
    }

    // Staff change PIN flow
    if (session.stage === 'staff_change_pin_current' && y === 2) {
      const currentPin = x[1].trim();

      if (!/^\d{4}$/.test(currentPin)) {
        return 'CON PIN must be exactly 4 digits\n\nEnter current PIN:\n\n00. Main menu';
      }

      sessionData.staffCurrentPin = currentPin;
      session.stage = 'staff_change_pin_new';
      return 'CON Enter your new 4-digit PIN:\n\n00. Main menu';
    }

    if (session.stage === 'staff_change_pin_new' && y === 3) {
      const newPin = x[2].trim();

      if (!/^\d{4}$/.test(newPin)) {
        return 'CON PIN must be exactly 4 digits\n\nEnter new PIN:\n\n00. Main menu';
      }

      sessionData.staffNewPin = newPin;
      session.stage = 'staff_change_pin_confirm';
      return 'CON Confirm your new 4-digit PIN:\n\n00. Main menu';
    }

    if (session.stage === 'staff_change_pin_confirm' && y === 4) {
      const confirmPin = x[3].trim();

      if (confirmPin !== sessionData.staffNewPin) {
        return 'CON PINs do not match\n\nEnter new PIN again:\n\n00. Main menu';
      }

      try {
        await this.staffService.changePin(staff.id, {
          currentPin: sessionData.staffCurrentPin,
          newPin: sessionData.staffNewPin,
        });

        return (
          `END PIN Changed Successfully!\n\n` +
          `Your PIN has been updated.\n\n` +
          `Dial ${this.ussdCode} to continue`
        );
      } catch (error) {
        this.logger.error(
          `Staff PIN change failed: ${(error as Error).message}`,
        );
        return (
          `END PIN Change Failed\n\n` +
          `${(error as Error).message}\n\n` +
          `Dial ${this.ussdCode} to try again`
        );
      }
    }

    return `END Invalid input\n\nDial ${this.ussdCode} again`;
  }

  /**
   * View wallet balance for farmers (includes savings)
   */
  private async viewBalance(phone: string): Promise<string> {
    try {
      const farmer = await this.farmerService.getFarmerByPhone(phone);
      if (!farmer || !farmer.userId) {
        this.logger.error(`Farmer not found for phone: ${phone}`);
        return 'END Unable to fetch balance.\n\nFarmer not found.';
      }

      // Get main wallet balance
      let mainBalance = 0;
      let totalEarned = 0;
      try {
        const balance = await this.walletService.getBalance(farmer.userId as any);
        mainBalance = balance.balance / 100;
        totalEarned = balance.total_earned / 100;
      } catch (walletError) {
        this.logger.error(`Wallet fetch failed: ${walletError.message}`);
        // Continue to show savings even if wallet fails
      }

      // Get savings balance
      let savingsBalance = 0;
      let savingsPercentage: number | null = null;
      try {
        const savings = await this.savingsService.getSavingsBalance(farmer.userId, 'farmer');
        savingsBalance = savings.balance / 100;
        savingsPercentage = savings.savings_percentage;
      } catch (savingsError) {
        this.logger.error(`Savings fetch failed: ${savingsError.message}`);
        // Continue without savings info
      }

      // Build response
      let response = `END My Balance\n\n` +
        `Available: ₦${mainBalance.toFixed(2)}\n` +
        `Savings: ₦${savingsBalance.toFixed(2)}\n`;
      
      if (savingsPercentage !== null) {
        response += `Savings Rate: ${savingsPercentage}%\n`;
      }
      
      response += `Total Earned: ₦${totalEarned.toFixed(2)}\n\n` +
        `Dial ${this.ussdCode} to continue`;

      return response;
    } catch (error) {
      this.logger.error(`Balance fetch failed: ${error.message}`);
      return 'END Unable to fetch balance.\n\nPlease try again later.';
    }
  }

  /**
   * View staff profile
   */
  private async viewStaffProfile(staff: any): Promise<string> {
    try {
      return (
        `END My Profile\n\n` +
        `Name: ${staff.firstName} ${staff.lastName}\n` +
        `Employee ID: ${staff.employeeId}\n` +
        `Role: ${staff.role}\n` +
        `Department: ${staff.department}\n` +
        `LGA: ${staff.lga}\n` +
        `Status: ${staff.isActive ? 'Active' : 'Inactive'}\n\n` +
        `Dial ${this.ussdCode} to continue`
      );
    } catch (error) {
      this.logger.error(`Staff profile fetch failed: ${error.message}`);
      return 'END Unable to fetch profile\n\nPlease try again later';
    }
  }

  /**
   * View staff wallet balance
   */
  private async viewStaffBalance(phone: string): Promise<string> {
    try {
      const staff = await this.staffService.getStaffByPhone(phone);
      const balance = await this.walletService.getBalance(staff.userId as any);

      const mainBalance = (balance.balance / 100).toFixed(2);
      const escrowBalance = (balance.escrow_balance / 100).toFixed(2);
      const totalEarned = (balance.total_earned / 100).toFixed(2);

      return (
        `END My Balance\n\n` +
        `Available: ₦${mainBalance}\n` +
        `Escrow: ₦${escrowBalance}\n` +
        `Total Earned: ₦${totalEarned}\n\n` +
        `Dial ${this.ussdCode} to continue`
      );
    } catch (error) {
      this.logger.error(`Staff balance fetch failed: ${error.message}`);
      return 'END Unable to fetch balance\n\nPlease try again later';
    }
  }

  /**
   * Show staff loan types
   */
  private async showStaffLoanTypes(sessionData: any): Promise<string> {
    try {
      const loanTypes = await this.loanService.getAllLoanTypes({
        is_active: true,
      });

      if (!loanTypes || loanTypes.length === 0) {
        return 'END No loan types available\n\nPlease try again later';
      }

      // Store loan types in session for later use
      sessionData.staffLoanTypes = loanTypes;

      let menu = 'CON Request Loan\nSelect loan type:\n\n';

      loanTypes.forEach((loanType: any, index: number) => {
        menu += `${index + 1}. ${loanType.name}\n`;
        menu += `   Rate: ${loanType.interest_rate}%\n`;
        menu += `   Duration: ${loanType.duration_months} months\n\n`;
      });

      menu += '00. Main menu';

      return menu;
    } catch (error) {
      this.logger.error(`Staff loan types fetch failed: ${error.message}`);
      return 'END Unable to load loan types\n\nPlease try again later';
    }
  }

  /**
   * Farmer registration flow (5 steps)
   * Steps: Dojah verification, name (if needed), LGA, farm size, PIN, confirm PIN
   */
  private async farmerRegistrationFlow(
    sessionId: string,
    session: any,
    phone: string,
    x: string[],
    y: number,
    originalPhone?: string, // Original phone format from Africa's Talking for Dojah
  ): Promise<string> {
    const sessionData = session.data;

    if (y === 1) {
      // Step 1: Try Dojah verification first
      session.stage = 'farmer_dojah_check';
      
      // Use original phone format for Dojah (with country code)
      const phoneForDojah = originalPhone || phone;
      this.logger.log(`Attempting Dojah verification for farmer: ${phoneForDojah}`);
      // Use timeout-protected Dojah call to prevent USSD timeout
      const dojahResult = await this.callDojahWithTimeout(phoneForDojah);
      
      if (dojahResult.status === 'success' && dojahResult.userRecord?.first_name) {
        // Auto-populate from Dojah
        sessionData.firstName = dojahResult.userRecord.first_name;
        sessionData.lastName = dojahResult.userRecord.last_name || dojahResult.userRecord.first_name;
        sessionData.dojahVerified = true;
        sessionData.state = dojahResult.userRecord.others?.address_state || 'Lagos';
        sessionData.lga = dojahResult.userRecord.others?.address_city || '';
        
        this.logger.log(`Dojah verification successful for ${phone}: ${sessionData.firstName} ${sessionData.lastName}`);
        
        session.stage = 'farmer_lga';
        
        // Skip name input, go straight to LGA
        if (sessionData.lga) {
          return (
            `CON Welcome ${sessionData.firstName}!\n\n` +
            `We found your details:\n` +
            `Name: ${sessionData.firstName} ${sessionData.lastName}\n` +
            `LGA: ${sessionData.lga}\n\n` +
            `Enter your farm size in hectares:\n` +
            '(e.g., 2.5)\n\n00. Main menu'
          );
        } else {
          return (
            `CON Welcome ${sessionData.firstName}!\n\n` +
            `We found your details:\n` +
            `Name: ${sessionData.firstName} ${sessionData.lastName}\n\n` +
            'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
          );
        }
      } else {
        // Dojah verification failed, proceed with manual input
        this.logger.log(`Dojah verification failed for ${phone}, proceeding with manual input`);
        sessionData.dojahVerified = false;
        session.stage = 'farmer_name';
        
        return (
          'CON Register as Farmer\n\n' +
          'For faster registration, use\n' +
          'a phone number linked to\n' +
          'your NIN.\n\n' +
          'Enter your full name:\n' +
          '(e.g., John Okafor)\n\n00. Main menu'
        );
      }
    } else if (y === 2) {
      // Check if Dojah was successful and user is entering farm size
      if (sessionData.dojahVerified && sessionData.lga) {
        // User has LGA from Dojah, so y=2 is farm size input
        const farmSizeInput = x[1].trim();
        const farmSize = parseFloat(farmSizeInput);

        if (isNaN(farmSize) || farmSize < 0.1) {
          return 'CON Invalid farm size\n\nEnter size in hectares:\n(Min: 0.1)\n\n00. Main menu';
        }

        sessionData.farmSize = farmSize;
        session.stage = 'farmer_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // User has name from Dojah but no LGA, so y=2 is LGA input
        sessionData.lga = x[1].trim();
        session.stage = 'farmer_farm_size';

        return (
          'CON Enter your farm size in hectares:\n' +
          '(e.g., 2.5)\n\n' +
          '00. Main menu'
        );
      }
      
      // Manual input flow (no Dojah): Step 2: Save name, ask for LGA
      const fullName = x[1].trim();
      const nameParts = fullName.split(' ');

      if (nameParts.length < 2) {
        // Save the first input (might be first name only)
        sessionData.firstName = nameParts[0];
        sessionData.nameRetry = true;
        return 'CON Please enter both first and last name:\n\n00. Main menu';
      }

      sessionData.firstName = nameParts[0];
      sessionData.lastName = nameParts.slice(1).join(' ');
      sessionData.nameRetry = false;
      session.stage = 'farmer_lga';

      return (
        `CON Welcome ${sessionData.firstName}!\n\n` +
        'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
      );
    } else if (y === 3) {
      // Check if Dojah was successful and user is entering PIN
      if (sessionData.dojahVerified && sessionData.lga) {
        // User has LGA from Dojah, so y=3 is PIN input
        const pin = x[2].trim();

        if (!/^\d{4}$/.test(pin)) {
          return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
        }

        sessionData.pin = pin;
        session.stage = 'farmer_confirm_pin';

        return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // User got name from Dojah, entered LGA at y=2, now entering farm size at y=3
        const farmSizeInput = x[2].trim();
        const farmSize = parseFloat(farmSizeInput);

        if (isNaN(farmSize) || farmSize < 0.1) {
          return 'CON Invalid farm size\n\nEnter size in hectares:\n(Min: 0.1)\n\n00. Main menu';
        }

        sessionData.farmSize = farmSize;
        session.stage = 'farmer_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      }
      
      // Manual input flow: Step 3: Handle name retry or proceed to LGA
      if (sessionData.nameRetry) {
        // User is re-entering name after validation failure
        const retryInput = x[2].trim();
        const retryParts = retryInput.split(' ');

        if (retryParts.length >= 2) {
          // User entered full name again
          sessionData.firstName = retryParts[0];
          sessionData.lastName = retryParts.slice(1).join(' ');
        } else if (sessionData.firstName && retryInput) {
          // User entered just last name (assuming first name was saved)
          sessionData.lastName = retryInput;
        } else {
          // Still invalid, prompt again
          return 'CON Please enter both first and last name:\n\n00. Main menu';
        }

        sessionData.nameRetry = false;
        session.stage = 'farmer_lga';

        return (
          `CON Welcome ${sessionData.firstName}!\n\n` +
          'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
        );
      }

      // Normal flow: Save LGA, ask for farm size
      sessionData.lga = x[2].trim();
      session.stage = 'farmer_farm_size';

      return (
        'CON Enter your farm size in hectares:\n' +
        '(e.g., 2.5)\n\n' +
        '00. Main menu'
      );
    } else if (y === 4) {
      // Check if Dojah verified and user has LGA - then y=4 is PIN confirmation
      if (sessionData.dojahVerified && sessionData.lga) {
        // User has all info from Dojah, entered farm size at y=2, PIN at y=3, confirming PIN at y=4
        const confirmPin = x[3].trim();

        if (confirmPin !== sessionData.pin) {
          return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
        }

        // Register farmer with Dojah-verified data
        try {
          const registerDto: RegisterFarmerDto = {
            phone: phone,
            pin: sessionData.pin,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            state: sessionData.state || 'Lagos',
            lga: sessionData.lga,
            farmSize: sessionData.farmSize,
          };

          await this.farmerService.register(registerDto);
          await this.smsService.sendFarmerWelcomeSms(
            sessionData.firstName,
            phone,
          );

          return (
            `END Registration successful!\n\n` +
            `Welcome ${sessionData.firstName}!\n\n` +
            `You will receive an SMS shortly.\n\n` +
            `Dial ${this.ussdCode} to start selling`
          );
        } catch (error) {
          this.logger.error(`Farmer registration failed: ${error.message}`);

          if (error.message.includes('already registered')) {
            return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
          }

          return 'END Registration failed\n\nPlease try again later';
        }
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // User got name from Dojah, entered LGA at y=2, farm size at y=3, now PIN at y=4
        const pin = x[3].trim();

        if (!/^\d{4}$/.test(pin)) {
          return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
        }

        sessionData.pin = pin;
        session.stage = 'farmer_confirm_pin';

        return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
      }
      
      // Manual input flow: Step 4: Save farm size, ask for PIN
      const farmSizeInput = x[3].trim();
      const farmSize = parseFloat(farmSizeInput);

      if (isNaN(farmSize) || farmSize < 0.1) {
        return 'CON Invalid farm size\n\nEnter size in hectares:\n(Min: 0.1)\n\n00. Main menu';
      }

      sessionData.farmSize = farmSize;
      session.stage = 'farmer_pin';

      return 'CON Create a 4-digit PIN:\n\n00. Main menu';
    } else if (y === 5) {
      // Check if Dojah verified without LGA - then y=5 is PIN confirmation
      if (sessionData.dojahVerified && !sessionData.lga) {
        // User: Dojah name -> LGA(y=2) -> farm size(y=3) -> PIN(y=4) -> confirm PIN(y=5)
        const confirmPin = x[4].trim();

        if (confirmPin !== sessionData.pin) {
          return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
        }

        // Register farmer
        try {
          const registerDto: RegisterFarmerDto = {
            phone: phone,
            pin: sessionData.pin,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            state: sessionData.state || 'Lagos',
            lga: sessionData.lga,
            farmSize: sessionData.farmSize,
          };

          await this.farmerService.register(registerDto);
          await this.smsService.sendFarmerWelcomeSms(
            sessionData.firstName,
            phone,
          );

          return (
            `END Registration successful!\n\n` +
            `Welcome ${sessionData.firstName}!\n\n` +
            `You will receive an SMS shortly.\n\n` +
            `Dial ${this.ussdCode} to start selling`
          );
        } catch (error) {
          this.logger.error(`Farmer registration failed: ${error.message}`);

          if (error.message.includes('already registered')) {
            return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
          }

          return 'END Registration failed\n\nPlease try again later';
        }
      }
      
      // Manual input flow: Step 5: Save PIN, ask for confirmation
      const pin = x[4].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      sessionData.pin = pin;
      session.stage = 'farmer_confirm_pin';

      return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
    } else if (y === 6) {
      // Manual input flow only: Step 6: Verify PIN and register
      const confirmPin = x[5].trim();

      if (confirmPin !== sessionData.pin) {
        return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
      }

      // Register farmer
      try {
        const registerDto: RegisterFarmerDto = {
          phone: phone,
          pin: sessionData.pin,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          state: 'Lagos', // TODO: Derive from LGA
          lga: sessionData.lga,
          farmSize: sessionData.farmSize,
        };

        await this.farmerService.register(registerDto);
        // Send welcome SMS
        await this.smsService.sendFarmerWelcomeSms(
          sessionData.firstName,
          phone,
        );

        return (
          `END Registration successful!\n\n` +
          `Welcome ${sessionData.firstName}!\n\n` +
          `You will receive an SMS shortly.\n\n` +
          `Dial ${this.ussdCode} to start selling`
        );
      } catch (error) {
        this.logger.error(`Farmer registration failed: ${error.message}`);

        if (error.message.includes('already registered')) {
          return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
        }

        return 'END Registration failed\n\nPlease try again later';
      }
    }

    return `END Invalid input\n\nPlease dial ${this.ussdCode} again`;
  }

  /**
   * Buyer registration flow (6 steps with Dojah)
   * Steps: Dojah verification, name (if needed), business name, LGA, buyer type, PIN, confirm PIN
   */
  private async buyerRegistrationFlow(
    sessionId: string,
    session: any,
    phone: string,
    x: string[],
    y: number,
    originalPhone?: string, // Original phone format from Africa's Talking for Dojah
  ): Promise<string> {
    const sessionData = session.data;

    if (y === 1) {
      // Step 1: Try Dojah verification first
      session.stage = 'buyer_dojah_check';
      
      // Use original phone format for Dojah (with country code)
      const phoneForDojah = originalPhone || phone;
      this.logger.log(`Attempting Dojah verification for buyer: ${phoneForDojah}`);
      // Use timeout-protected Dojah call to prevent USSD timeout
      const dojahResult = await this.callDojahWithTimeout(phoneForDojah);
      
      if (dojahResult.status === 'success' && dojahResult.userRecord?.first_name) {
        // Auto-populate from Dojah
        sessionData.firstName = dojahResult.userRecord.first_name;
        sessionData.lastName = dojahResult.userRecord.last_name || dojahResult.userRecord.first_name;
        sessionData.dojahVerified = true;
        sessionData.state = dojahResult.userRecord.others?.address_state || 'Kano';
        sessionData.lga = dojahResult.userRecord.others?.address_city || '';
        
        this.logger.log(`Dojah verification successful for buyer ${phone}: ${sessionData.firstName} ${sessionData.lastName}`);
        
        session.stage = 'buyer_business';
        
        // Skip name input, go straight to business name
        return (
          `CON Welcome ${sessionData.firstName}!\n\n` +
          `We found your details:\n` +
          `Name: ${sessionData.firstName} ${sessionData.lastName}\n\n` +
          'Enter your business name:\n\n00. Main menu'
        );
      } else {
        // Dojah verification failed, proceed with manual input
        this.logger.log(`Dojah verification failed for buyer ${phone}, proceeding with manual input`);
        sessionData.dojahVerified = false;
        session.stage = 'buyer_name';
        
        return (
          'CON Register as Buyer\n\n' +
          'For faster registration, use\n' +
          'a phone number linked to\n' +
          'your NIN.\n\n' +
          'Enter your full name:\n' +
          '(e.g., Amina Ibrahim)\n\n00. Main menu'
        );
      }
    } else if (y === 2) {
      // Check if Dojah was successful - then y=2 is business name
      if (sessionData.dojahVerified) {
        sessionData.businessName = x[1].trim();
        session.stage = 'buyer_lga';
        
        // If we have LGA from Dojah, skip to buyer type
        if (sessionData.lga) {
          session.stage = 'buyer_type';
          return (
            `CON Business: ${sessionData.businessName}\n` +
            `LGA: ${sessionData.lga}\n\n` +
            'Select buyer type:\n\n' +
            '1. Processor\n' +
            '2. Aggregator\n' +
            '3. Trader\n' +
            '4. Exporter\n\n' +
            '00. Main menu'
          );
        } else {
          return 'CON Enter your LGA:\n(e.g., Nassarawa)\n\n00. Main menu';
        }
      }
      
      // Manual input flow: Step 2: Save name, ask for business name
      const fullName = x[1].trim();
      const nameParts = fullName.split(' ');

      if (nameParts.length < 2) {
        // Save the first input (might be first name only)
        sessionData.firstName = nameParts[0];
        sessionData.nameRetry = true;
        return 'CON Please enter both first and last name:\n\n00. Main menu';
      }

      sessionData.firstName = nameParts[0];
      sessionData.lastName = nameParts.slice(1).join(' ');
      sessionData.nameRetry = false;
      session.stage = 'buyer_business';

      return (
        `CON Welcome ${sessionData.firstName}!\n\n` +
        'Enter your business name:\n\n00. Main menu'
      );
    } else if (y === 3) {
      // Check if Dojah verified with LGA - then y=3 is buyer type
      if (sessionData.dojahVerified && sessionData.lga) {
        const buyerTypeInput = x[2].trim();
        const buyerTypes = ['processor', 'aggregator', 'trader', 'exporter'];
        const buyerTypeIndex = parseInt(buyerTypeInput) - 1;

        if (buyerTypeIndex < 0 || buyerTypeIndex >= buyerTypes.length) {
          return (
            'CON Invalid option\n\n' +
            'Select buyer type:\n' +
            '1. Processor\n' +
            '2. Aggregator\n' +
            '3. Trader\n' +
            '4. Exporter\n\n' +
            '00. Main menu'
          );
        }

        sessionData.buyerType = buyerTypes[buyerTypeIndex];
        session.stage = 'buyer_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=3 is LGA input
        sessionData.lga = x[2].trim();
        session.stage = 'buyer_type';

        return (
          'CON Select buyer type:\n\n' +
          '1. Processor\n' +
          '2. Aggregator\n' +
          '3. Trader\n' +
          '4. Exporter\n\n' +
          '00. Main menu'
        );
      }
      
      // Manual input flow: Step 3: Handle name retry or proceed to business name
      if (sessionData.nameRetry) {
        // User is re-entering name after validation failure
        const retryInput = x[2].trim();
        const retryParts = retryInput.split(' ');

        if (retryParts.length >= 2) {
          // User entered full name again
          sessionData.firstName = retryParts[0];
          sessionData.lastName = retryParts.slice(1).join(' ');
        } else if (sessionData.firstName && retryInput) {
          // User entered just last name (assuming first name was saved)
          sessionData.lastName = retryInput;
        } else {
          // Still invalid, prompt again
          return 'CON Please enter both first and last name:\n\n00. Main menu';
        }

        sessionData.nameRetry = false;
        session.stage = 'buyer_business';

        return (
          `CON Welcome ${sessionData.firstName}!\n\n` +
          'Enter your business name:\n\n00. Main menu'
        );
      }

      // Normal flow: Save business name, ask for LGA
      sessionData.businessName = x[2].trim();
      session.stage = 'buyer_lga';

      return 'CON Enter your LGA:\n(e.g., Nassarawa)\n\n00. Main menu';
    } else if (y === 4) {
      // Check if Dojah verified with LGA - then y=4 is PIN
      if (sessionData.dojahVerified && sessionData.lga) {
        const pin = x[3].trim();

        if (!/^\d{4}$/.test(pin)) {
          return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
        }

        sessionData.pin = pin;
        session.stage = 'buyer_confirm_pin';

        return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=4 is buyer type
        const buyerTypeInput = x[3].trim();
        const buyerTypes = ['processor', 'aggregator', 'trader', 'exporter'];
        const buyerTypeIndex = parseInt(buyerTypeInput) - 1;

        if (buyerTypeIndex < 0 || buyerTypeIndex >= buyerTypes.length) {
          return (
            'CON Invalid option\n\n' +
            'Select buyer type:\n' +
            '1. Processor\n' +
            '2. Aggregator\n' +
            '3. Trader\n' +
            '4. Exporter\n\n' +
            '00. Main menu'
          );
        }

        sessionData.buyerType = buyerTypes[buyerTypeIndex];
        session.stage = 'buyer_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      }
      
      // Manual input flow: Step 4: Save LGA, ask for buyer type
      sessionData.lga = x[3].trim();
      session.stage = 'buyer_type';

      return (
        'CON Select buyer type:\n\n' +
        '1. Processor\n' +
        '2. Aggregator\n' +
        '3. Trader\n' +
        '4. Exporter\n\n' +
        '00. Main menu'
      );
    } else if (y === 5) {
      // Check if Dojah verified with LGA - then y=5 is PIN confirmation
      if (sessionData.dojahVerified && sessionData.lga) {
        const confirmPin = x[4].trim();

        if (confirmPin !== sessionData.pin) {
          return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
        }

        // Register buyer with Dojah-verified data
        try {
          const registerDto: RegisterBuyerDto = {
            phone: phone,
            pin: sessionData.pin,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            businessName: sessionData.businessName,
            state: sessionData.state || 'Kano',
            lga: sessionData.lga,
            buyerType: sessionData.buyerType,
          };

          await this.buyerService.register(registerDto);
          await this.smsService.sendBuyerWelcomeSms(sessionData.firstName, phone);

          return (
            `END Registration successful!\n\n` +
            `Welcome ${sessionData.firstName}!\n\n` +
            `You will receive an SMS shortly.\n\n` +
            `Dial ${this.ussdCode} to start buying`
          );
        } catch (error) {
          this.logger.error(`Buyer registration failed: ${error.message}`);

          if (error.message.includes('already registered')) {
            return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
          }

          return 'END Registration failed\n\nPlease try again later';
        }
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=5 is PIN
        const pin = x[4].trim();

        if (!/^\d{4}$/.test(pin)) {
          return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
        }

        sessionData.pin = pin;
        session.stage = 'buyer_confirm_pin';

        return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
      }
      
      // Manual input flow: Step 5: Save buyer type, ask for PIN
      const buyerTypeInput = x[4].trim();
      const buyerTypes = ['processor', 'aggregator', 'trader', 'exporter'];
      const buyerTypeIndex = parseInt(buyerTypeInput) - 1;

      if (buyerTypeIndex < 0 || buyerTypeIndex >= buyerTypes.length) {
        return (
          'CON Invalid option\n\n' +
          'Select buyer type:\n' +
          '1. Processor\n' +
          '2. Aggregator\n' +
          '3. Trader\n' +
          '4. Exporter\n\n' +
          '00. Main menu'
        );
      }

      sessionData.buyerType = buyerTypes[buyerTypeIndex];
      session.stage = 'buyer_pin';

      return 'CON Create a 4-digit PIN:\n\n00. Main menu';
    } else if (y === 6) {
      // Check if Dojah verified without LGA - then y=6 is PIN confirmation
      if (sessionData.dojahVerified && !sessionData.lga) {
        const confirmPin = x[5].trim();

        if (confirmPin !== sessionData.pin) {
          return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
        }

        // Register buyer
        try {
          const registerDto: RegisterBuyerDto = {
            phone: phone,
            pin: sessionData.pin,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            businessName: sessionData.businessName,
            state: sessionData.state || 'Kano',
            lga: sessionData.lga,
            buyerType: sessionData.buyerType,
          };

          await this.buyerService.register(registerDto);
          await this.smsService.sendBuyerWelcomeSms(sessionData.firstName, phone);

          return (
            `END Registration successful!\n\n` +
            `Welcome ${sessionData.firstName}!\n\n` +
            `You will receive an SMS shortly.\n\n` +
            `Dial ${this.ussdCode} to start buying`
          );
        } catch (error) {
          this.logger.error(`Buyer registration failed: ${error.message}`);

          if (error.message.includes('already registered')) {
            return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
          }

          return 'END Registration failed\n\nPlease try again later';
        }
      }
      
      // Manual input flow only: Step 6: Save PIN, ask for confirmation
      const pin = x[5].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      sessionData.pin = pin;
      session.stage = 'buyer_confirm_pin';

      return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
    } else if (y === 7) {
      // Manual input flow only: Step 7: Verify PIN and register
      // Step 7: Verify PIN and register
      const confirmPin = x[6].trim();

      if (confirmPin !== sessionData.pin) {
        return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
      }

      // Register buyer
      try {
        const registerDto: RegisterBuyerDto = {
          phone: phone,
          pin: sessionData.pin,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          businessName: sessionData.businessName,
          state: 'Kano', // TODO: Derive from LGA
          lga: sessionData.lga,
          buyerType: sessionData.buyerType,
        };

        await this.buyerService.register(registerDto);
        // Send welcome SMS
        await this.smsService.sendBuyerWelcomeSms(sessionData.firstName, phone);

        return (
          `END Registration successful!\n\n` +
          `Welcome ${sessionData.firstName}!\n\n` +
          `You will receive an SMS shortly.\n\n` +
          `Dial ${this.ussdCode} to start buying`
        );
      } catch (error) {
        this.logger.error(`Buyer registration failed: ${error.message}`);

        if (error.message.includes('already registered')) {
          return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
        }

        return 'END Registration failed\n\nPlease try again later';
      }
    }

    return `END Invalid input\n\nPlease dial ${this.ussdCode} again`;
  }

  /**
   * Show paginated bank list
   */
  private async showBankList(
    page: number = 1,
    searchTerm?: string,
  ): Promise<string> {
    try {
      let banks = await this.paystackService.getBankList();

      // Apply search filter if search term provided
      if (searchTerm) {
        banks = this.paystackService.searchBanks(searchTerm, banks);

        if (banks.length === 0) {
          return 'CON No banks found\n\n0. Search again\n\n00. Main menu';
        }
      } else {
        // Sort with popular banks first if not searching
        banks = this.paystackService.sortBanksWithPopularFirst(banks);
      }

      const {
        banks: pageBanks,
        hasNext,
        hasPrevious,
      } = this.paystackService.formatBanksForUssd(banks, page, 5);

      let response = searchTerm
        ? `CON Search: "${searchTerm}" (${banks.length} found)\n\n`
        : 'CON Select Bank:\n(Popular banks listed first)\n\n';

      pageBanks.forEach((bank, index) => {
        response += `${index + 1}. ${bank.name}\n`;
      });

      response += '\n';

      if (hasNext) {
        response += '6. Next Page\n';
      }
      if (hasPrevious) {
        response += '7. Previous Page\n';
      }

      if (!searchTerm) {
        response += '0. Search Bank\n';
      }

      response += '\n00. Main menu';
      return response;
    } catch (error) {
      this.logger.error(`Bank list fetch failed: ${(error as Error).message}`);
      return 'END Unable to load banks\n\nPlease try again later';
    }
  }

  /**
   * Get bank from paginated selection
   */
  private async getBankFromSelection(
    page: number,
    selection: number,
    searchTerm?: string,
  ): Promise<any> {
    let banks = await this.paystackService.getBankList();

    // Apply search filter if search term provided
    if (searchTerm) {
      banks = this.paystackService.searchBanks(searchTerm, banks);
    } else {
      // Sort with popular banks first if not searching
      banks = this.paystackService.sortBanksWithPopularFirst(banks);
    }

    const { banks: pageBanks } = this.paystackService.formatBanksForUssd(
      banks,
      page,
      5,
    );

    if (selection > 0 && selection <= pageBanks.length) {
      return pageBanks[selection - 1];
    }

    return undefined;
  }

  /**
   * Show available loan types
   */
  private async showLoanTypes(sessionData: any): Promise<string> {
    try {
      // Get active loan types
      const loanTypes = await this.loanService.getAllLoanTypes({
        is_active: true,
      });

      if (loanTypes.length === 0) {
        return 'END No loan types available\n\nPlease try again later';
      }

      // Store loan types in session data
      sessionData.loanTypes = loanTypes;

      // Build menu
      let response = 'CON Get Loan\nSelect loan type:\n\n';
      loanTypes.forEach((loanType, index) => {
        response += `${index + 1}. ${loanType.name}\n`;
      });
      response += '\n00. Main menu';

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to load loan types: ${(error as Error).message}`,
      );
      return 'END Unable to load loan types\n\nPlease try again later';
    }
  }

  /**
   * Get or create USSD session in database
   */
  private async getOrCreateSession(
    sessionId: string,
    phoneNumber: string,
    networkCode?: string,
  ): Promise<any> {
    try {
      // Check if session exists in database
      let dbSession = await this.ussdSessionModel.findOne({
        session_id: sessionId,
      });

      if (!dbSession) {
        // Create new session in database
        dbSession = await this.ussdSessionModel.create({
          session_id: sessionId,
          phone_number: phoneNumber,
          network_provider: this.mapNetworkCode(networkCode, phoneNumber),
          status: 'active',
          start_time: new Date(),
          step_count: 0,
          last_menu: 'main_menu',
          session_data: {},
        });

        this.logger.log(
          `Created new USSD session: ${sessionId} for ${phoneNumber}`,
        );
      }

      // Also maintain in-memory session for backward compatibility
      let memorySession = this.sessions.get(sessionId);
      if (!memorySession) {
        memorySession = {
          phoneNumber,
          stage: 'welcome',
          data: dbSession.session_data || {},
        };
        this.sessions.set(sessionId, memorySession);
      }

      return memorySession;
    } catch (error) {
      this.logger.error(`Error creating USSD session: ${error.message}`);
      // Fallback to memory-only session
      let session = this.sessions.get(sessionId);
      if (!session) {
        session = {
          phoneNumber,
          stage: 'welcome',
          data: {},
        };
        this.sessions.set(sessionId, session);
      }
      return session;
    }
  }

  /**
   * Map network code (MCCMNC) to provider name
   * Network codes for Nigerian operators:
   * - 62120: Airtel Nigeria
   * - 62125: Visafone (MTN associated)
   * - 62130: MTN Nigeria
   * - 62140: Ntel
   * - 62150: Globacom (Glo)
   * - 62160: 9mobile (formerly Etisalat)
   * - 62124: Spectranet
   */
  private mapNetworkCode(networkCode?: string, phoneNumber?: string): string {
    if (!networkCode && !phoneNumber) return 'UNKNOWN';

    // MCCMNC code mapping (priority: use network code from Africa's Talking)
    const mccmncMap: Record<string, string> = {
      '62120': 'AIRTEL',
      '62124': 'SPECTRANET',
      '62125': 'MTN', // Visafone (MTN associated)
      '62130': 'MTN',
      '62140': 'NTEL',
      '62150': 'GLO',
      '62160': '9MOBILE',
    };

    // First, try to match MCCMNC code
    if (networkCode && mccmncMap[networkCode]) {
      return mccmncMap[networkCode];
    }

    // Fallback: Try to extract network from phone number prefix
    const phonePrefix = phoneNumber?.substring(0, 3);
    const prefixMap: Record<string, string> = {
      '621': 'MTN',
      '622': 'MTN',
      '623': 'MTN',
      '624': 'MTN',
      '625': 'GLO',
      '626': 'GLO',
      '627': 'GLO',
      '628': 'AIRTEL',
      '629': 'AIRTEL',
      '630': 'MTN',
      '631': 'MTN',
      '632': 'MTN',
      '633': 'MTN',
      '634': 'MTN',
      '635': 'GLO',
      '636': 'GLO',
      '637': 'GLO',
      '638': 'GLO',
      '639': 'GLO',
      '640': 'MTN',
      '641': 'MTN',
      '642': 'MTN',
      '643': 'MTN',
      '644': 'MTN',
      '645': 'GLO',
      '646': 'GLO',
      '647': 'GLO',
      '648': 'GLO',
      '649': 'GLO',
      '650': 'MTN',
      '651': 'MTN',
      '652': 'MTN',
      '653': 'MTN',
      '654': 'MTN',
      '655': 'MTN',
      '670': 'AIRTEL',
      '701': 'AIRTEL',
      '702': 'AIRTEL',
      '703': 'AIRTEL',
      '704': 'AIRTEL',
      '705': 'GLO',
      '706': 'MTN',
      '707': 'AIRTEL',
      '708': 'AIRTEL',
      '709': '9MOBILE',
      '710': 'MTN',
      '711': 'GLO',
      '712': 'AIRTEL',
      '713': 'MTN',
      '714': 'MTN',
      '715': 'GLO',
      '716': 'MTN',
      '717': 'AIRTEL',
      '718': 'AIRTEL',
      '719': 'STARCOMMS',
      '720': 'AIRTEL',
      '721': 'AIRTEL',
      '722': 'AIRTEL',
      '723': 'MTN',
      '724': 'MTN',
      '725': 'AIRTEL',
      '726': 'AIRTEL',
      '727': 'AIRTEL',
      '728': 'AIRTEL',
      '729': 'AIRTEL',
      '730': 'MTN',
      '731': 'MTN',
      '732': 'MTN',
      '733': 'MTN',
      '734': 'MTN',
      '735': 'MTN',
      '736': 'MTN',
      '737': 'MTN',
      '738': 'MTN',
      '739': 'MTN',
      '740': 'AIRTEL',
      '741': 'AIRTEL',
      '742': 'AIRTEL',
      '743': 'AIRTEL',
      '744': 'AIRTEL',
      '745': 'GLO',
      '746': 'GLO',
      '747': 'GLO',
      '748': 'GLO',
      '749': 'GLO',
      '750': 'AIRTEL',
      '751': 'AIRTEL',
      '752': 'AIRTEL',
      '753': 'AIRTEL',
      '754': 'AIRTEL',
      '755': 'GLO',
      '756': 'GLO',
      '757': 'GLO',
      '758': 'GLO',
      '759': 'GLO',
      '760': 'MTN',
      '761': 'MTN',
      '762': 'MTN',
      '763': 'MTN',
      '764': 'MTN',
      '765': 'MTN',
      '766': 'MTN',
      '767': 'MTN',
      '768': 'MTN',
      '769': 'MTN',
      '770': 'MTN',
      '771': 'MTN',
      '772': 'MTN',
      '773': 'MTN',
      '774': 'MTN',
      '775': 'MTN',
      '776': 'MTN',
      '777': 'MTN',
      '778': 'MTN',
      '779': 'MTN',
      '780': 'AIRTEL',
      '781': 'AIRTEL',
      '782': 'AIRTEL',
      '783': 'AIRTEL',
      '784': 'AIRTEL',
      '785': 'AIRTEL',
      '786': 'AIRTEL',
      '787': 'AIRTEL',
      '788': 'AIRTEL',
      '789': 'AIRTEL',
      '790': '9MOBILE',
      '791': '9MOBILE',
      '792': '9MOBILE',
      '793': '9MOBILE',
      '794': '9MOBILE',
      '795': '9MOBILE',
      '796': '9MOBILE',
      '797': '9MOBILE',
      '798': '9MOBILE',
      '799': '9MOBILE',
    };

    if (phonePrefix && prefixMap[phonePrefix]) {
      return prefixMap[phonePrefix];
    }

    return 'UNKNOWN';
  }

  /**
   * Update session progress in database
   */
  private async updateSessionProgress(
    sessionId: string,
    stepCount: number,
    currentMenu: string,
  ): Promise<void> {
    try {
      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            step_count: stepCount,
            last_menu: currentMenu,
            updated_at: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating session progress: ${error.message}`);
    }
  }

  /**
   * End USSD session in database
   */
  private async endSession(sessionId: string, action?: string): Promise<void> {
    try {
      const endTime = new Date();

      // Get session to calculate duration
      const session = await this.ussdSessionModel.findOne({
        session_id: sessionId,
      });
      let duration = 0;

      if (session && session.start_time) {
        duration = Math.floor(
          (endTime.getTime() - session.start_time.getTime()) / 1000,
        );
      }

      const status = action === 'error' ? 'failed' : 'completed';

      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            status,
            end_time: endTime,
            duration,
            action,
            updated_at: endTime,
          },
        },
      );

      this.logger.log(
        `Ended USSD session: ${sessionId} with status: ${status}`,
      );
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`);
    }
  }

  /**
   * Update session with error information
   */
  private async updateSessionError(
    sessionId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            status: 'failed',
            error_message: errorMessage,
            end_time: new Date(),
            updated_at: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating session error: ${error.message}`);
    }
  }

  /**
   * Determine action from response text
   */
  private determineActionFromResponse(response: string): string {
    if (response.includes('balance') || response.includes('Balance')) {
      return 'check_balance';
    } else if (response.includes('loan') || response.includes('Loan')) {
      return 'apply_loan';
    } else if (response.includes('price') || response.includes('Price')) {
      return 'check_price';
    } else if (
      response.includes('registered') ||
      response.includes('Registration')
    ) {
      return 'registration';
    } else if (response.includes('PIN') || response.includes('pin')) {
      return 'change_pin';
    } else if (response.includes('withdraw') || response.includes('Withdraw')) {
      return 'withdrawal';
    } else if (response.includes('error') || response.includes('Error')) {
      return 'error';
    }
    return 'session_complete';
  }

  /**
   * Get current menu from session state
   */
  private getCurrentMenu(
    session: any,
    inputs: string[],
    level: number,
  ): string {
    if (!session || !session.stage) return 'main_menu';

    const stage = session.stage;

    // Map session stages to menu names
    const menuMap: Record<string, string> = {
      welcome: 'main_menu',
      farmer_name: 'farmer_registration',
      farmer_lga: 'farmer_registration',
      farmer_farm_size: 'farmer_registration',
      farmer_pin: 'farmer_registration',
      farmer_confirm_pin: 'farmer_registration',
      buyer_name: 'buyer_registration',
      buyer_business: 'buyer_registration',
      buyer_lga: 'buyer_registration',
      buyer_type: 'buyer_registration',
      buyer_pin: 'buyer_registration',
      buyer_confirm_pin: 'buyer_registration',
      wallet_menu: 'wallet_menu',
      withdraw_menu: 'withdrawal_menu',
      withdraw_amount_saved: 'withdrawal_amount',
      withdraw_pin_saved: 'withdrawal_pin',
      withdraw_select_bank: 'bank_selection',
      withdraw_account_number: 'account_input',
      loan_menu: 'loan_menu',
      loan_confirm: 'loan_confirmation',
      loan_purpose: 'loan_purpose',
      market_price_menu: 'market_prices',
      change_pin_current: 'change_pin',
      change_pin_new: 'change_pin',
      change_pin_confirm: 'change_pin',
    };

    return menuMap[stage] || stage;
  }

  /**
   * Update session data in database
   */
  private async updateSessionData(
    sessionId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            session_data: data,
            updated_at: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating session data: ${error.message}`);
    }
  }

  /**
   * Set user ID for identified sessions
   */
  private async setSessionUser(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            user_id: userId,
            updated_at: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error setting session user: ${error.message}`);
    }
  }

  /**
   * Show available market prices
   */
  private async showMarketPrices(sessionData: any): Promise<string> {
    try {
      // Get all active products
      const result = await this.adminService.getAllProducts({
        isActive: 'true',
        limit: 10,
        page: 1,
      });

      const products = result.products;

      if (products.length === 0) {
        return 'END No products available\n\nPlease try again later';
      }

      // Store products in session data
      sessionData.products = products;

      // Build menu
      let response = 'CON Market Prices\nSelect product:\n\n';
      products.forEach((product, index) => {
        response += `${index + 1}. ${product.productName} (${product.size})\n`;
      });
      response += '\n00. Main menu';

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to load market prices: ${(error as Error).message}`,
      );
      return 'END Unable to load prices\n\nPlease try again later';
    }
  }

  /**
   * Staff registration flow (6 steps with Dojah)
   * Steps: Dojah verification, name (if needed), LGA, role, department, PIN, confirm PIN
   */
  private async staffRegistrationFlow(
    sessionId: string,
    session: any,
    phone: string,
    x: string[],
    y: number,
    originalPhone?: string, // Original phone format from Africa's Talking for Dojah
  ): Promise<string> {
    const sessionData = session.data;

    if (y === 1) {
      // Step 1: Try Dojah verification first
      session.stage = 'staff_dojah_check';
      
      // Use original phone format for Dojah (with country code)
      const phoneForDojah = originalPhone || phone;
      this.logger.log(`Attempting Dojah verification for staff: ${phoneForDojah}`);
      // Use timeout-protected Dojah call to prevent USSD timeout
      const dojahResult = await this.callDojahWithTimeout(phoneForDojah);
      
      if (dojahResult.status === 'success' && dojahResult.userRecord?.first_name) {
        // Auto-populate from Dojah
        sessionData.firstName = dojahResult.userRecord.first_name;
        sessionData.lastName = dojahResult.userRecord.last_name || dojahResult.userRecord.first_name;
        sessionData.dojahVerified = true;
        sessionData.state = dojahResult.userRecord.others?.address_state || 'Lagos';
        sessionData.lga = dojahResult.userRecord.others?.address_city || '';
        
        this.logger.log(`Dojah verification successful for staff ${phone}: ${sessionData.firstName} ${sessionData.lastName}`);
        
        session.stage = 'staff_lga';
        
        // Skip name input, proceed based on LGA availability
        if (sessionData.lga) {
          session.stage = 'staff_role';
          return (
            `CON Welcome ${sessionData.firstName}!\n\n` +
            `We found your details:\n` +
            `Name: ${sessionData.firstName} ${sessionData.lastName}\n` +
            `LGA: ${sessionData.lga}\n\n` +
            'Select your role:\n\n' +
            '1. Field Officer\n' +
            '2. Manager\n' +
            '3. Supervisor\n' +
            '4. Admin Staff\n' +
            '5. Other\n\n' +
            '00. Main menu'
          );
        } else {
          return (
            `CON Welcome ${sessionData.firstName}!\n\n` +
            `We found your details:\n` +
            `Name: ${sessionData.firstName} ${sessionData.lastName}\n\n` +
            'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
          );
        }
      } else {
        // Dojah verification failed, proceed with manual input
        this.logger.log(`Dojah verification failed for staff ${phone}, proceeding with manual input`);
        sessionData.dojahVerified = false;
        session.stage = 'staff_name';
        
        return (
          'CON Register as Staff\n\n' +
          'For faster registration, use\n' +
          'a phone number linked to\n' +
          'your NIN.\n\n' +
          'Enter your full name:\n' +
          '(e.g., John Okafor)\n\n00. Main menu'
        );
      }
    } else if (y === 2) {
      // Check if Dojah was successful with LGA - then y=2 is role
      if (sessionData.dojahVerified && sessionData.lga) {
        const roleInput = x[1].trim();
        const roles = [
          'field_officer',
          'manager',
          'supervisor',
          'admin_staff',
          'other',
        ];
        const roleIndex = parseInt(roleInput) - 1;

        if (roleIndex < 0 || roleIndex >= roles.length) {
          return 'CON Invalid option\n\nSelect your role:\n\n1. Field Officer\n2. Manager\n3. Supervisor\n4. Admin Staff\n5. Other\n\n00. Main menu';
        }

        sessionData.role = roles[roleIndex];
        session.stage = 'staff_department';

        return (
          'CON Select department:\n\n' +
          '1. Operations\n' +
          '2. Finance\n' +
          '3. Logistics\n' +
          '4. Marketing\n' +
          '5. Other\n\n' +
          '00. Main menu'
        );
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=2 is LGA input
        sessionData.lga = x[1].trim();
        session.stage = 'staff_role';

        return (
          'CON Select your role:\n\n' +
          '1. Field Officer\n' +
          '2. Manager\n' +
          '3. Supervisor\n' +
          '4. Admin Staff\n' +
          '5. Other\n\n' +
          '00. Main menu'
        );
      }
      
      // Manual input flow: Step 2: Save name, ask for LGA
      const fullName = x[1].trim();
      const nameParts = fullName.split(' ');

      if (nameParts.length < 2) {
        sessionData.firstName = nameParts[0];
        sessionData.nameRetry = true;
        return 'CON Please enter both first and last name:\n\n00. Main menu';
      }

      sessionData.firstName = nameParts[0];
      sessionData.lastName = nameParts.slice(1).join(' ');
      sessionData.nameRetry = false;
      session.stage = 'staff_lga';

      return (
        `CON Welcome ${sessionData.firstName}!\n\n` +
        'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
      );
    } else if (y === 3) {
      // Check if Dojah verified with LGA - then y=3 is department
      if (sessionData.dojahVerified && sessionData.lga) {
        const deptInput = x[2].trim();
        const departments = [
          'operations',
          'finance',
          'logistics',
          'marketing',
          'other',
        ];
        const deptIndex = parseInt(deptInput) - 1;

        if (deptIndex < 0 || deptIndex >= departments.length) {
          return 'CON Invalid option\n\nSelect department:\n\n1. Operations\n2. Finance\n3. Logistics\n4. Marketing\n5. Other\n\n00. Main menu';
        }

        sessionData.department = departments[deptIndex];
        session.stage = 'staff_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=3 is role
        const roleInput = x[2].trim();
        const roles = [
          'field_officer',
          'manager',
          'supervisor',
          'admin_staff',
          'other',
        ];
        const roleIndex = parseInt(roleInput) - 1;

        if (roleIndex < 0 || roleIndex >= roles.length) {
          return 'CON Invalid option\n\nSelect your role:\n\n1. Field Officer\n2. Manager\n3. Supervisor\n4. Admin Staff\n5. Other\n\n00. Main menu';
        }

        sessionData.role = roles[roleIndex];
        session.stage = 'staff_department';

        return (
          'CON Select department:\n\n' +
          '1. Operations\n' +
          '2. Finance\n' +
          '3. Logistics\n' +
          '4. Marketing\n' +
          '5. Other\n\n' +
          '00. Main menu'
        );
      }
      
      // Manual input flow: Step 3: Handle name retry or proceed to LGA
      if (sessionData.nameRetry) {
        const retryInput = x[2].trim();
        const retryParts = retryInput.split(' ');

        if (retryParts.length >= 2) {
          sessionData.firstName = retryParts[0];
          sessionData.lastName = retryParts.slice(1).join(' ');
        } else if (sessionData.firstName && retryInput) {
          sessionData.lastName = retryInput;
        } else {
          return 'CON Please enter both first and last name:\n\n00. Main menu';
        }

        sessionData.nameRetry = false;
        session.stage = 'staff_lga';

        return (
          `CON Welcome ${sessionData.firstName}!\n\n` +
          'Enter your LGA:\n(e.g., Ikeja)\n\n00. Main menu'
        );
      }

      // Normal flow: Save LGA, ask for role
      sessionData.lga = x[2].trim();
      session.stage = 'staff_role';

      return (
        'CON Select your role:\n\n' +
        '1. Field Officer\n' +
        '2. Manager\n' +
        '3. Supervisor\n' +
        '4. Admin Staff\n' +
        '5. Other\n\n' +
        '00. Main menu'
      );
    } else if (y === 4) {
      // Check if Dojah verified with LGA - then y=4 is PIN
      if (sessionData.dojahVerified && sessionData.lga) {
        const pin = x[3].trim();

        if (!/^\d{4}$/.test(pin)) {
          return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
        }

        sessionData.pin = pin;
        session.stage = 'staff_confirm_pin';

        return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
      } else if (sessionData.dojahVerified && !sessionData.lga) {
        // Dojah verified without LGA - y=4 is department
        const deptInput = x[3].trim();
        const departments = [
          'operations',
          'finance',
          'logistics',
          'marketing',
          'other',
        ];
        const deptIndex = parseInt(deptInput) - 1;

        if (deptIndex < 0 || deptIndex >= departments.length) {
          return 'CON Invalid option\n\nSelect department:\n\n1. Operations\n2. Finance\n3. Logistics\n4. Marketing\n5. Other\n\n00. Main menu';
        }

        sessionData.department = departments[deptIndex];
        session.stage = 'staff_pin';

        return 'CON Create a 4-digit PIN:\n\n00. Main menu';
      }
      
      // Manual input flow: Step 4: Save role, ask for department
      const roleInput = x[3].trim();
      const roles = [
        'field_officer',
        'manager',
        'supervisor',
        'admin_staff',
        'other',
      ];
      const roleIndex = parseInt(roleInput) - 1;

      if (roleIndex < 0 || roleIndex >= roles.length) {
        return 'CON Invalid option\n\nSelect your role:\n\n1. Field Officer\n2. Manager\n3. Supervisor\n4. Admin Staff\n5. Other\n\n00. Main menu';
      }

      sessionData.role = roles[roleIndex];
      session.stage = 'staff_department';

      return (
        'CON Select department:\n\n' +
        '1. Operations\n' +
        '2. Finance\n' +
        '3. Logistics\n' +
        '4. Marketing\n' +
        '5. Other\n\n' +
        '00. Main menu'
      );
    } else if (y === 5) {
      // Step 5: Save department, ask for PIN
      const deptInput = x[4].trim();
      const departments = [
        'operations',
        'finance',
        'logistics',
        'marketing',
        'other',
      ];
      const deptIndex = parseInt(deptInput) - 1;

      if (deptIndex < 0 || deptIndex >= departments.length) {
        return 'CON Invalid option\n\nSelect department:\n\n1. Operations\n2. Finance\n3. Logistics\n4. Marketing\n5. Other\n\n00. Main menu';
      }

      sessionData.department = departments[deptIndex];
      session.stage = 'staff_pin';

      return 'CON Create a 4-digit PIN:\n\n00. Main menu';
    } else if (y === 6) {
      // Check if Dojah verified without LGA - then y=6 is PIN confirmation
      if (sessionData.dojahVerified && !sessionData.lga) {
        const confirmPin = x[5].trim();

        if (confirmPin !== sessionData.pin) {
          return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
        }

        // Register staff
        try {
          const registerDto: any = {
            phone: phone,
            pin: sessionData.pin,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            lga: sessionData.lga,
            role: sessionData.role,
            department: sessionData.department,
          };

          await this.staffService.register(registerDto);

          return (
            `END Registration submitted!\n\n` +
            `Welcome ${sessionData.firstName}!\n\n` +
            `Your account is pending approval.\n` +
            `You will be notified once approved.\n\n` +
            `Thank you!`
          );
        } catch (error) {
          this.logger.error(`Staff registration failed: ${error.message}`);

          if (error.message.includes('already registered')) {
            return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
          }

          return 'END Registration failed\n\nPlease try again later';
        }
      }
      
      // Manual input flow only: Step 6: Save PIN, ask for confirmation
      const pin = x[5].trim();

      if (!/^\d{4}$/.test(pin)) {
        return 'CON PIN must be exactly 4 digits\n\nTry again:\n\n00. Main menu';
      }

      sessionData.pin = pin;
      session.stage = 'staff_confirm_pin';

      return 'CON Confirm your 4-digit PIN:\n\n00. Main menu';
    } else if (y === 7) {
      // Manual input flow only: Step 7: Verify PIN and register
      const confirmPin = x[6].trim();

      if (confirmPin !== sessionData.pin) {
        return `END PINs do not match\n\nPlease dial ${this.ussdCode} to try again`;
      }

      // Register staff
      try {
        const registerDto: any = {
          phone: phone,
          pin: sessionData.pin,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          lga: sessionData.lga,
          role: sessionData.role,
          department: sessionData.department,
        };

        await this.staffService.register(registerDto);

        return (
          `END Registration submitted!\n\n` +
          `Welcome ${sessionData.firstName}!\n\n` +
          `Your account is pending approval.\n` +
          `You will be notified once approved.\n\n` +
          `Thank you!`
        );
      } catch (error) {
        this.logger.error(`Staff registration failed: ${error.message}`);

        if (error.message.includes('already registered')) {
          return `END Phone number already registered\n\nDial ${this.ussdCode} to login`;
        }

        return 'END Registration failed\n\nPlease try again later';
      }
    }

    return `END Invalid input\n\nPlease dial ${this.ussdCode} again`;
  }
}
