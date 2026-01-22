import * as bcrypt from 'bcrypt';

/**
 * Hash a 4-digit PIN using bcrypt
 *
 * @param pin - Plain text PIN (4 digits)
 * @returns Hashed PIN
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Compare plain text PIN with hashed PIN
 *
 * @param plainPin - Plain text PIN
 * @param hashedPin - Hashed PIN from database
 * @returns True if PIN matches, false otherwise
 */
export async function comparePin(
  plainPin: string,
  hashedPin: string,
): Promise<boolean> {
  return bcrypt.compare(plainPin, hashedPin);
}

/**
 * Validate PIN strength (must be exactly 4 digits)
 *
 * @param pin - PIN to validate
 * @returns True if valid, false otherwise
 */
export function isValidPin(pin: string): boolean {
  const pinRegex = /^\d{4}$/;
  return pinRegex.test(pin);
}

/**
 * Normalize phone number by removing country code and leading zeros
 *
 * @param phone - Phone number in any format
 * @returns Normalized phone number (10 digits without country code)
 */
export function normalizePhoneNumber(phone: string): {
  phone: string;
  phoneCode: string;
} {
  let normalizedPhone = phone.trim();
  let phoneCode = '234'; // Default to Nigeria

  // Remove + if present
  if (normalizedPhone.startsWith('+')) {
    normalizedPhone = normalizedPhone.substring(1);
  }

  // Handle +234 format
  if (normalizedPhone.startsWith('234')) {
    phoneCode = '234';
    normalizedPhone = normalizedPhone.substring(3);
  }

  // Remove leading 0
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = normalizedPhone.substring(1);
  }

  return {
    phone: normalizedPhone,
    phoneCode,
  };
}

/**
 * Format phone number for SMS (with country code)
 *
 * @param phone - Phone number without country code
 * @param phoneCode - Country code (default: 234)
 * @returns Formatted phone number (+234XXXXXXXXXX)
 */
export function formatPhoneForSms(
  phone: string,
  phoneCode: string = '234',
): string {
  return `+${phoneCode}${phone}`;
}
