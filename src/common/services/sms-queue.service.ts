import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMSLogRepository } from '../repositories/sms-log.repository';
import { PhoneUtil } from '../utils/phone.util';
import axios from 'axios';

export interface SMSJob {
  id: string;
  to: string;
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
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

@Injectable()
export class SmsQueueService implements OnModuleInit {
  private readonly logger = new Logger(SmsQueueService.name);
  private queue: SMSJob[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Dojah configuration
  private dojahApiUrl: string;
  private dojahAppId: string;
  private dojahPrivateKey: string;
  private senderId = 'PROMISEPTA';

  constructor(
    private readonly configService: ConfigService,
    private readonly smsLogRepository: SMSLogRepository,
  ) {
    // Initialize Dojah
    this.dojahApiUrl = this.configService.get<string>('DOJAH_API_URL') || 'https://api.dojah.io';
    this.dojahAppId = this.configService.get<string>('DOJAH_APP_ID') || '';
    this.dojahPrivateKey = this.configService.get<string>('DOJAH_PRIVATE_KEY') || '';

    if (this.dojahAppId && this.dojahPrivateKey) {
      this.logger.log('Dojah SMS service initialized');
    } else {
      this.logger.warn(
        'Dojah credentials not configured. SMS will be logged only.',
      );
    }
  }

  onModuleInit() {
    // Start processing queue every 5 seconds
    this.startQueueProcessor();
    this.logger.log('SMS Queue processor started');
  }

  /**
   * Add SMS job to queue
   *
   * @param to - Phone number with country code
   * @param message - SMS message
   * @param messageType - Type of SMS
   * @returns Job ID
   */
  async queueSms(
    to: string,
    message: string,
    messageType: SMSJob['messageType'],
  ): Promise<string> {
    // Validate and format phone number
    let formattedPhone: string;
    try {
      formattedPhone = PhoneUtil.isValidPhoneNumber(to) 
        ? (to.startsWith('+') ? to : PhoneUtil.formatPhoneNumber(to))
        : PhoneUtil.formatPhoneNumber(to);
    } catch (error) {
      this.logger.error(`Invalid phone number format: ${to} - ${error.message}`);
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const jobId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: SMSJob = {
      id: jobId,
      to: formattedPhone,
      message,
      messageType,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.logger.log(
      `SMS job queued: ${jobId} - ${messageType} to ${formattedPhone} (Queue size: ${this.queue.length})`,
    );

    // Create initial log entry
    await this.smsLogRepository.create({
      recipient_phone: formattedPhone,
      sender_id: this.senderId,
      message,
      message_type: messageType,
      status: 'sent', // Will be updated when actually sent
    });

    return jobId;
  }

  /**
   * Start background queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000);
  }

  /**
   * Stop background queue processor
   */
  stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log('SMS Queue processor stopped');
    }
  }

  /**
   * Process queued SMS jobs
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      // Process up to 10 jobs at a time
      const batchSize = 10;
      const jobsToProcess = this.queue.splice(0, batchSize);

      this.logger.log(
        `Processing ${jobsToProcess.length} SMS jobs (${this.queue.length} remaining)`,
      );

      // Process jobs in parallel
      await Promise.all(
        jobsToProcess.map((job) => this.processSmsJob(job)),
      );
    } catch (error) {
      this.logger.error(
        `Error processing SMS queue: ${error.message}`,
        error.stack,
      );
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single SMS job
   *
   * @param job - SMS job to process
   */
  private async processSmsJob(job: SMSJob): Promise<void> {
    job.attempts++;
    job.lastAttemptAt = new Date();

    try {
      let messageId: string | undefined;
      let status: 'sent' | 'delivered' | 'failed' = 'sent';

      // Send SMS if Dojah is configured
      if (this.dojahAppId && this.dojahPrivateKey) {
        // Format phone number for Dojah (needs format like 09036614542 or 2349036614542)
        let dojahPhone = job.to;
        if (dojahPhone.startsWith('+234')) {
          dojahPhone = '0' + dojahPhone.substring(4); // +234xxx -> 0xxx
        } else if (dojahPhone.startsWith('234')) {
          dojahPhone = '0' + dojahPhone.substring(3); // 234xxx -> 0xxx
        }

        const response = await axios.post(
          `${this.dojahApiUrl}/api/v1/messaging/sms`,
          {
            destination: dojahPhone,
            message: job.message,
            channel: 'sms',
            sender_id: this.senderId,
            priority: false,
          },
          {
            headers: {
              'Authorization': this.dojahPrivateKey,
              'AppId': this.dojahAppId,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 second timeout for SMS
          },
        );

        this.logger.log(
          `SMS sent successfully: Job ${job.id} - Response: ${JSON.stringify(response.data)}`,
        );

        // Parse Dojah response
        // Response format: { entity: [{ status: "Sent", mobile: "...", message_id: "...", reference_id: "..." }] }
        const entity = response.data?.entity?.[0];
        if (entity) {
          messageId = entity.message_id || entity.reference_id;
          status = entity.status?.toLowerCase() === 'sent' ? 'sent' : 'failed';
        }

        // If failed, check if we should retry
        if (status === 'failed' && job.attempts < job.maxAttempts) {
          this.logger.warn(
            `SMS job ${job.id} failed, will retry (${job.attempts}/${job.maxAttempts})`,
          );
          this.queue.push(job); // Re-queue for retry
          return;
        }
      } else {
        // Log only mode (development)
        this.logger.log('=== SMS (LOG ONLY MODE - Dojah not configured) ===');
        this.logger.log(`Job ID: ${job.id}`);
        this.logger.log(`To: ${job.to}`);
        this.logger.log(`Sender ID: ${this.senderId}`);
        this.logger.log(`Type: ${job.messageType}`);
        this.logger.log(`Message: ${job.message}`);
        this.logger.log('===========================');
      }

      // Update database log
      await this.smsLogRepository.create({
        recipient_phone: job.to,
        sender_id: this.senderId,
        message: job.message,
        message_type: job.messageType,
        status,
        message_id: messageId,
      });

      this.logger.log(
        `SMS job ${job.id} completed successfully (${status})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process SMS job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Log detailed Dojah error if available
      if (error.response) {
        this.logger.error(`Dojah SMS Error - Status: ${error.response.status}`);
        this.logger.error(`Dojah SMS Error - Data: ${JSON.stringify(error.response.data)}`);
      }

      job.error = error.message;

      // Retry if not exceeded max attempts
      if (job.attempts < job.maxAttempts) {
        this.logger.warn(
          `SMS job ${job.id} failed, will retry (${job.attempts}/${job.maxAttempts})`,
        );
        this.queue.push(job); // Re-queue for retry
      } else {
        this.logger.error(
          `SMS job ${job.id} failed after ${job.attempts} attempts, giving up`,
        );

        // Log final failure
        await this.smsLogRepository.create({
          recipient_phone: job.to,
          sender_id: this.senderId,
          message: job.message,
          message_type: job.messageType,
          status: 'failed',
          failure_reason: `Failed after ${job.attempts} attempts: ${error.message}`,
        });
      }
    }
  }

  /**
   * Get queue statistics
   *
   * @returns Queue statistics
   */
  getQueueStats(): {
    queueSize: number;
    processing: boolean;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
    };
  }

  /**
   * Clear the queue (for testing/maintenance)
   */
  clearQueue(): void {
    const clearedJobs = this.queue.length;
    this.queue = [];
    this.logger.warn(`Cleared ${clearedJobs} jobs from SMS queue`);
  }
}
