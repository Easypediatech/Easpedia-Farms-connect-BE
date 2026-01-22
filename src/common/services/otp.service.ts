import { Injectable } from '@nestjs/common';

export interface OtpData {
  otp: string;
  phone: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

@Injectable()
export class OtpService {
  private otpStore = new Map<string, OtpData>();
  private readonly OTP_EXPIRY_MINUTES = 10; // 10 minutes
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Generate and store OTP for phone number
   */
  generateOtp(phone: string): string {
    const otp = this.generateRandomOtp();
    const key = this.getOtpKey(phone);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.otpStore.set(key, {
      otp,
      phone,
      expiresAt,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
    });

    return otp;
  }

  /**
   * Verify OTP for phone number
   */
  verifyOtp(phone: string, otp: string): boolean {
    const key = this.getOtpKey(phone);
    const otpData = this.otpStore.get(key);

    if (!otpData) {
      return false; // No OTP found
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(key);
      return false;
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(key);
      return false;
    }

    // Increment attempt count
    otpData.attempts++;

    // Verify OTP
    if (otpData.otp === otp) {
      // OTP is valid, remove from store
      this.otpStore.delete(key);
      return true;
    }

    // Update attempt count in store
    this.otpStore.set(key, otpData);
    return false;
  }

  /**
   * Check if OTP exists for phone number
   */
  hasActiveOtp(phone: string): boolean {
    const key = this.getOtpKey(phone);
    const otpData = this.otpStore.get(key);

    if (!otpData) {
      return false;
    }

    // Check if expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear OTP for phone number
   */
  clearOtp(phone: string): void {
    const key = this.getOtpKey(phone);
    this.otpStore.delete(key);
  }

  /**
   * Get remaining attempts for phone number
   */
  getRemainingAttempts(phone: string): number {
    const key = this.getOtpKey(phone);
    const otpData = this.otpStore.get(key);

    if (!otpData) {
      return 0;
    }

    return Math.max(0, otpData.maxAttempts - otpData.attempts);
  }

  private generateRandomOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpKey(phone: string): string {
    return `pin_reset_${phone}`;
  }

  /**
   * Cleanup expired OTPs periodically
   */
  cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [key, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(key);
      }
    }
  }
}
