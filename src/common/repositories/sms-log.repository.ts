import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SMSLog, SMSLogDocument } from '../../schemas/sms-log.schema';

export interface CreateSMSLogDto {
  recipient_phone: string;
  sender_id?: string;
  message: string;
  message_type:
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
  status?: 'sent' | 'delivered' | 'failed';
  message_id?: string;
  cost?: number;
  failure_reason?: string;
}

@Injectable()
export class SMSLogRepository {
  private readonly logger = new Logger(SMSLogRepository.name);

  constructor(
    @InjectModel(SMSLog.name) private smsLogModel: Model<SMSLogDocument>,
  ) {}

  /**
   * Create a new SMS log entry
   *
   * @param createSMSLogDto - SMS log data
   * @returns Created SMS log
   */
  async create(createSMSLogDto: CreateSMSLogDto): Promise<SMSLogDocument> {
    const smsLog = new this.smsLogModel({
      ...createSMSLogDto,
      status: createSMSLogDto.status || 'sent',
    });

    return smsLog.save();
  }

  /**
   * Update SMS log status
   *
   * @param messageId - Africa's Talking message ID
   * @param status - New status
   * @param failureReason - Optional failure reason
   * @returns Updated SMS log
   */
  async updateStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'failed',
    failureReason?: string,
  ): Promise<SMSLogDocument | null> {
    return this.smsLogModel
      .findOneAndUpdate(
        { message_id: messageId },
        {
          $set: {
            status,
            ...(failureReason && { failure_reason: failureReason }),
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Get SMS logs by phone number
   *
   * @param phone - Recipient phone number
   * @param limit - Maximum number of logs to return
   * @returns SMS logs
   */
  async findByPhone(
    phone: string,
    limit: number = 50,
  ): Promise<SMSLogDocument[]> {
    return this.smsLogModel
      .find({ recipient_phone: phone })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get SMS logs by message type
   *
   * @param messageType - Type of SMS
   * @param limit - Maximum number of logs to return
   * @returns SMS logs
   */
  async findByMessageType(
    messageType: string,
    limit: number = 50,
  ): Promise<SMSLogDocument[]> {
    return this.smsLogModel
      .find({ message_type: messageType })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get failed SMS logs
   *
   * @param limit - Maximum number of logs to return
   * @returns Failed SMS logs
   */
  async findFailed(limit: number = 50): Promise<SMSLogDocument[]> {
    return this.smsLogModel
      .find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
