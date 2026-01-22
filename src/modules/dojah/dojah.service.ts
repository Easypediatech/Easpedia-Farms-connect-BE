import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DojahPhoneVerificationResult {
  firstName?: string;
  lastName?: string;
  gender?: string;
  addressState?: string;
  addressCity?: string;
  email?: string;
}

export interface DojahVerificationResponse {
  status: 'success' | 'error';
  userRecord?: {
    first_name?: string;
    last_name?: string;
    phone: string;
    others: {
      address_state?: string;
      address_city?: string;
      gender?: string;
      email?: string;
    };
    email?: string;
  };
  message?: string;
}

@Injectable()
export class DojahService {
  private readonly logger = new Logger(DojahService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verify phone number with Dojah and get user details
   * Similar to userNIMC function in sosocare
   */
  async verifyPhoneNumber(phone: string): Promise<DojahVerificationResponse> {
    try {
      // Check if this is a test phone number from Africa's Talking
      if (phone.includes('901111') || phone.includes('1234567890')) {
        this.logger.warn(
          `Test phone number detected: ${phone}. Skipping Dojah verification.`,
        );
        return {
          status: 'error',
          message: 'Test phone number - Dojah verification skipped',
        };
      }

      let finalPhone = phone;

      // Normalize phone number to the format Dojah expects (08123456789)
      if (phone.startsWith('0')) {
        finalPhone = phone; // Already in correct format
      } else if (phone.startsWith('234')) {
        finalPhone = '0' + phone.substring(3); // Remove 234, add 0
      } else if (phone.startsWith('+234')) {
        finalPhone = '0' + phone.substring(4); // Remove +234, add 0
      } else if (phone.length === 10 && /^[7890]/.test(phone)) {
        // Add 0 prefix if it's 10 digits starting with 7, 8, 9, or 0
        finalPhone = '0' + phone;
      } else if (phone.length === 11 && phone.startsWith('0')) {
        // Already correct format
        finalPhone = phone;
      } else {
        // Try to extract from any format - last resort
        const digits = phone.replace(/\D/g, ''); // Remove all non-digits
        if (digits.length === 13 && digits.startsWith('234')) {
          // Format: 234XXXXXXXXXX
          finalPhone = '0' + digits.substring(3);
        } else if (digits.length === 11 && digits.startsWith('0')) {
          // Format: 0XXXXXXXXXX
          finalPhone = digits;
        } else if (digits.length === 10) {
          // Format: XXXXXXXXXX (without country code or leading 0)
          finalPhone = '0' + digits;
        } else {
          this.logger.warn(`Could not normalize phone number: ${phone}`);
          return {
            status: 'error',
            message: 'Invalid phone number format',
          };
        }
      }

      // Validate final phone number format - Nigerian numbers start with 070, 080, 081, 090, 091, etc.
      if (!finalPhone.match(/^0[789]\d{9}$/)) {
        this.logger.warn(`Invalid Nigerian phone number: ${finalPhone}`);
        return {
          status: 'error',
          message: 'Invalid Nigerian phone number format',
        };
      }

      this.logger.log(`Verifying phone number: ${phone} -> ${finalPhone}`);

      const apiUrl = this.configService.get('DOJAH_API_URL');
      const appId = this.configService.get('DOJAH_APP_ID');
      const privateKey = this.configService.get('DOJAH_PRIVATE_KEY');
      
      // Correct endpoint: /phone_number (not /phone_number/basic)
      const requestUrl = `${apiUrl}/api/v1/kyc/phone_number?phone_number=${finalPhone}`;
      
      this.logger.log(`Dojah Request URL: ${requestUrl}`);
      this.logger.log(`Dojah AppId: ${appId}`);
      this.logger.log(`Dojah Auth Key (first 15 chars): ${privateKey?.substring(0, 15)}...`);

      try {
        const response = await axios.get(
          requestUrl,
          {
            headers: {
              'Authorization': privateKey,
              'AppId': appId,
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout (increased for better reliability)
          },
        );

        this.logger.log(`Dojah response for ${finalPhone}:`, response.data);

        const person = response.data.entity;

        if (!person) {
          return {
            status: 'error',
            message: 'No user data found for this phone number',
          };
        }

        const first_name = person.firstName;
        const last_name = person.lastName;
        const gender = person.gender;
        const address_state = person.addressState;
        const address_city = person.addressCity;
        const email = person.email || `defaultemail_${phone}@farmconnect.com`;

        const userRecord = {
          first_name,
          last_name,
          phone: phone, // Use original phone format
          others: {
            address_state,
            address_city,
            gender,
            email,
          },
          email,
        };

        return {
          status: 'success',
          userRecord,
        };
      } catch (error: any) {
        this.logger.error(
          `Dojah verification error for phone ${phone}: ${error.message}`,
        );
        
        // Log detailed error response from Dojah
        if (error.response) {
          this.logger.error(`Dojah Response Status: ${error.response.status}`);
          this.logger.error(`Dojah Response Data: ${JSON.stringify(error.response.data)}`);
        }
        
        this.logger.error(`Request URL: ${requestUrl}`);
        
        return {
          status: 'error',
          message: error.response?.data?.error || 'Could not verify phone number with Dojah',
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Dojah verification error for phone ${phone}: ${error.message}`,
      );
      return {
        status: 'error',
        message: 'Could not verify phone number with Dojah',
      };
    }
  }

  /**
   * Auto-register user with Dojah verified details
   * Similar to autoRegisterUser function in sosocare
   */
  async autoRegisterUser(
    phone: string,
    pin?: string,
  ): Promise<DojahVerificationResponse & { userId?: string }> {
    try {
      const verificationResult = await this.verifyPhoneNumber(phone);

      if (
        verificationResult.status === 'error' ||
        !verificationResult.userRecord
      ) {
        return verificationResult;
      }

      const userRecord = verificationResult.userRecord;

      // Return the user record for further processing by the calling service
      // The actual user registration will be handled by FarmerService or BuyerService
      return {
        status: 'success',
        userRecord: {
          first_name: userRecord.first_name,
          last_name: userRecord.last_name,
          phone: userRecord.phone,
          others: userRecord.others || {
            address_state: '',
            address_city: '',
            gender: '',
            email: userRecord.email || `defaultemail_${phone}@farmconnect.com`,
          },
          email: userRecord.email,
          // Add default PIN if provided
          ...(pin && { password: pin }),
        },
      };
    } catch (error) {
      this.logger.error(
        `Auto registration error for phone ${phone}:`,
        error.message,
      );
      return {
        status: 'error',
        message: 'Could not auto-register user',
      };
    }
  }

  /**
   * Check if phone number can be verified with Dojah
   */
  async canVerifyPhone(phone: string): Promise<boolean> {
    try {
      const result = await this.verifyPhoneNumber(phone);
      return result.status === 'success' && !!result.userRecord?.first_name;
    } catch (error) {
      this.logger.error(
        `Phone verification check failed for ${phone}:`,
        error.message,
      );
      return false;
    }
  }
}
