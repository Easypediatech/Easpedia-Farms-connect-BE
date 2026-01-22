import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
}

export interface PaystackBankListResponse {
  status: boolean;
  message: string;
  data: PaystackBank[];
}

export interface PaystackAccountVerification {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface PaystackAccountVerificationResponse {
  status: boolean;
  message: string;
  data: PaystackAccountVerification;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }

    this.secretKey = secretKey;

    this.axiosInstance = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Check if running in test mode (secret key starts with sk_test)
   */
  private isTestMode(): boolean {
    return this.secretKey.startsWith('sk_test');
  }

  /**
   * Get list of banks supported by Paystack
   *
   * @param country - Country code (default: 'nigeria')
   * @param currency - Currency code (default: 'NGN')
   * @returns List of banks
   */
  async getBankList(
    country: string = 'nigeria',
    currency: string = 'NGN',
  ): Promise<PaystackBank[]> {
    try {
      this.logger.log(
        `Fetching bank list for country: ${country}, currency: ${currency}`,
      );

      const response = await this.axiosInstance.get<PaystackBankListResponse>(
        '/bank',
        {
          params: {
            country,
            currency,
            perPage: 100, // Get all banks
          },
        },
      );

      if (!response.data.status) {
        throw new HttpException(
          'Failed to fetch bank list from Paystack',
          HttpStatus.BAD_GATEWAY,
        );
      }

      this.logger.log(`Retrieved ${response.data.data.length} banks`);
      return response.data.data.filter((bank) => bank.active);
    } catch (error) {
      this.logger.error(
        `Error fetching bank list: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as Record<string, unknown>;
        const errorMessage =
          (errorData?.message as string) || 'Failed to fetch bank list';
        throw new HttpException(
          errorMessage,
          error.response?.status || HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        'Failed to fetch bank list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify bank account number
   *
   * @param accountNumber - 10-digit account number
   * @param bankCode - Bank code from Paystack
   * @returns Account verification details
   */
  async verifyAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<PaystackAccountVerification> {
    try {
      this.logger.log(
        `Verifying account: ${accountNumber} with bank code: ${bankCode}`,
      );

      const response =
        await this.axiosInstance.get<PaystackAccountVerificationResponse>(
          '/bank/resolve',
          {
            params: {
              account_number: accountNumber,
              bank_code: bankCode,
            },
          },
        );

      if (!response.data.status) {
        this.logger.error(
          `Paystack verification failed: ${JSON.stringify(response.data)}`,
        );
        throw new HttpException(
          'Failed to verify account number',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Account verified: ${response.data.data.account_name}`);
      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error verifying account: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as Record<string, unknown>;
        this.logger.error(
          `Paystack API error: ${JSON.stringify(errorData)}, status: ${error.response?.status}`,
        );
        const errorMessage =
          (errorData?.message as string) || 'Failed to verify account number';
        const statusCode = error.response?.status;

        // Handle rate limit (429) in test mode - return mock data
        if (statusCode === 429 && this.isTestMode()) {
          this.logger.warn(
            'Rate limit exceeded in test mode. Using mock account verification.',
          );
          return {
            account_number: accountNumber,
            account_name: 'TEST ACCOUNT HOLDER', // Mock name in test mode
            bank_id: 0,
          };
        }

        throw new HttpException(
          errorMessage,
          statusCode || HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        'Failed to verify account number',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get bank by code
   *
   * @param bankCode - Bank code
   * @returns Bank details or undefined
   */
  async getBankByCode(bankCode: string): Promise<PaystackBank | undefined> {
    const banks = await this.getBankList();
    return banks.find((bank) => bank.code === bankCode);
  }

  /**
   * Get popular Nigerian banks (most commonly used)
   *
   * @returns List of popular bank codes
   */
  getPopularBankCodes(): string[] {
    return [
      '044', // Access Bank
      '063', // Access Bank (Diamond)
      '050', // Ecobank
      '070', // Fidelity Bank
      '011', // First Bank
      '214', // First City Monument Bank (FCMB)
      '058', // Guaranty Trust Bank (GTBank)
      '030', // Heritage Bank
      '301', // Jaiz Bank
      '082', // Keystone Bank
      '526', // Parallex Bank
      '076', // Polaris Bank
      '101', // Providus Bank
      '221', // Stanbic IBTC Bank
      '068', // Standard Chartered Bank
      '232', // Sterling Bank
      '100', // Suntrust Bank
      '032', // Union Bank
      '033', // United Bank for Africa (UBA)
      '215', // Unity Bank
      '035', // Wema Bank
      '057', // Zenith Bank
      '304', // Opay
      '999992', // PalmPay
      '100004', // Kuda Bank
    ];
  }

  /**
   * Sort banks with popular banks first
   *
   * @param banks - List of banks
   * @returns Sorted list with popular banks first
   */
  sortBanksWithPopularFirst(banks: PaystackBank[]): PaystackBank[] {
    const popularCodes = this.getPopularBankCodes();
    const popular: PaystackBank[] = [];
    const others: PaystackBank[] = [];

    banks.forEach((bank) => {
      if (popularCodes.includes(bank.code)) {
        popular.push(bank);
      } else {
        others.push(bank);
      }
    });

    // Sort popular banks by their order in popularCodes
    popular.sort((a, b) => {
      const aIndex = popularCodes.indexOf(a.code);
      const bIndex = popularCodes.indexOf(b.code);
      return aIndex - bIndex;
    });

    // Sort others alphabetically
    others.sort((a, b) => a.name.localeCompare(b.name));

    return [...popular, ...others];
  }

  /**
   * Search banks by name
   *
   * @param searchTerm - Search term
   * @param banks - List of banks to search
   * @returns Filtered list of banks matching search term
   */
  searchBanks(searchTerm: string, banks: PaystackBank[]): PaystackBank[] {
    const term = searchTerm.toLowerCase().trim();
    return banks.filter((bank) => bank.name.toLowerCase().includes(term));
  }

  /**
   * Format banks for USSD display (pagination)
   *
   * @param banks - List of banks
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @returns Formatted banks for current page and pagination info
   */
  formatBanksForUssd(
    banks: PaystackBank[],
    page: number = 1,
    pageSize: number = 5,
  ): {
    banks: PaystackBank[];
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const totalPages = Math.ceil(banks.length / pageSize);

    return {
      banks: banks.slice(startIndex, endIndex),
      currentPage: page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}
