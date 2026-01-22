/**
 * Phone number utility functions
 */
export class PhoneUtil {
  /**
   * Format phone number to include country code
   * @param phone - Phone number without country code
   * @param countryCode - Country code (default: 234 for Nigeria)
   * @returns Formatted phone number with +
   */
  static formatPhoneNumber(phone: string, countryCode = '234'): string {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Remove any existing country code or + sign
    const cleanPhone = phone.replace(/^\+?234/, '').replace(/^0/, '');
    
    // Validate Nigerian phone number format (should be 10 digits after removing country code)
    if (!/^[789]\d{9}$/.test(cleanPhone)) {
      throw new Error(`Invalid Nigerian phone number format: ${phone}`);
    }

    return `+${countryCode}${cleanPhone}`;
  }

  /**
   * Validate phone number format
   * @param phone - Phone number to validate
   * @returns boolean
   */
  static isValidPhoneNumber(phone: string): boolean {
    try {
      PhoneUtil.formatPhoneNumber(phone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract phone and country code from user data
   * @param user - User object with phone and phone_code
   * @returns Formatted phone number
   */
  static formatUserPhone(user: { phone: string; phone_code?: string }): string {
    const countryCode = user.phone_code || '234';
    return PhoneUtil.formatPhoneNumber(user.phone, countryCode);
  }
}