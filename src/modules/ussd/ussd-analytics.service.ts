import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UssdSession,
  UssdSessionDocument,
} from '../../schemas/ussd-session.schema';

export interface NetworkTrafficData {
  network: string;
  sessions: number;
  percentage: number;
}

export interface SessionStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface TopActionData {
  action: string;
  count: number;
  percentage: number;
}

export interface RecentSessionData {
  sessionId: string;
  phoneNumber: string;
  network: string;
  status: string;
  action?: string;
  startTime: Date;
  duration?: number;
}

export interface UssdAnalyticsResponse {
  totalSessions: number;
  successRate: number;
  avgDuration: number;
  failedSessions: number;
  activeSessions: number;
  networkTraffic: NetworkTrafficData[];
  sessionStatus: SessionStatusData[];
  topActions: TopActionData[];
  recentSessions: RecentSessionData[];
  refreshedAt: Date;
}

@Injectable()
export class UssdAnalyticsService {
  private readonly logger = new Logger(UssdAnalyticsService.name);

  constructor(
    @InjectModel(UssdSession.name)
    private readonly ussdSessionModel: Model<UssdSessionDocument>,
  ) {}

  /**
   * Get comprehensive USSD analytics and KPIs
   */
  async getUssdAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UssdAnalyticsResponse> {
    try {
      // Set default date range (last 30 days if not provided)
      const end = endDate || new Date();
      const start =
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalSessions,
        completedSessions,
        failedSessions,
        activeSessionsCount,
        avgDurationResult,
        networkTraffic,
        sessionStatus,
        topActions,
        recentSessions,
      ] = await Promise.all([
        this.getTotalSessions(start, end),
        this.getCompletedSessions(start, end),
        this.getFailedSessions(start, end),
        this.getActiveSessions(),
        this.getAverageDuration(start, end),
        this.getNetworkTraffic(start, end),
        this.getSessionStatus(start, end),
        this.getTopActions(start, end),
        this.getRecentSessions(20), // Last 20 sessions
      ]);

      const successRate =
        totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      return {
        totalSessions,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: avgDurationResult || 0,
        failedSessions,
        activeSessions: activeSessionsCount,
        networkTraffic,
        sessionStatus,
        topActions,
        recentSessions,
        refreshedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error fetching USSD analytics:', error);
      throw error;
    }
  }

  /**
   * Get total sessions in date range
   */
  private async getTotalSessions(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.ussdSessionModel.countDocuments({
      start_time: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  /**
   * Get completed sessions count
   */
  private async getCompletedSessions(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.ussdSessionModel.countDocuments({
      status: 'completed',
      start_time: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  /**
   * Get failed sessions count
   */
  private async getFailedSessions(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.ussdSessionModel.countDocuments({
      status: 'failed',
      start_time: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  /**
   * Get active sessions count (real-time)
   */
  private async getActiveSessions(): Promise<number> {
    return await this.ussdSessionModel.countDocuments({
      status: 'active',
    });
  }

  /**
   * Get average session duration
   */
  private async getAverageDuration(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.ussdSessionModel.aggregate([
      {
        $match: {
          start_time: {
            $gte: startDate,
            $lte: endDate,
          },
          duration: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    return result.length > 0 ? Math.round(result[0].avgDuration) : 0;
  }

  /**
   * Get traffic by network operator
   */
  private async getNetworkTraffic(
    startDate: Date,
    endDate: Date,
  ): Promise<NetworkTrafficData[]> {
    const result = await this.ussdSessionModel.aggregate([
      {
        $match: {
          start_time: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$network_provider',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalSessions = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      network: item._id || 'UNKNOWN',
      sessions: item.count,
      percentage:
        totalSessions > 0
          ? Math.round((item.count / totalSessions) * 100 * 100) / 100
          : 0,
    }));
  }

  /**
   * Get session status breakdown
   */
  private async getSessionStatus(
    startDate: Date,
    endDate: Date,
  ): Promise<SessionStatusData[]> {
    const result = await this.ussdSessionModel.aggregate([
      {
        $match: {
          start_time: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalSessions = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      status: item._id,
      count: item.count,
      percentage:
        totalSessions > 0
          ? Math.round((item.count / totalSessions) * 100 * 100) / 100
          : 0,
    }));
  }

  /**
   * Get top actions performed
   */
  private async getTopActions(
    startDate: Date,
    endDate: Date,
  ): Promise<TopActionData[]> {
    const result = await this.ussdSessionModel.aggregate([
      {
        $match: {
          start_time: {
            $gte: startDate,
            $lte: endDate,
          },
          action: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10, // Top 10 actions
      },
    ]);

    const totalActions = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      action: item._id,
      count: item.count,
      percentage:
        totalActions > 0
          ? Math.round((item.count / totalActions) * 100 * 100) / 100
          : 0,
    }));
  }

  /**
   * Get recent sessions
   */
  private async getRecentSessions(
    limit: number = 20,
  ): Promise<RecentSessionData[]> {
    const sessions = await this.ussdSessionModel
      .find(
        {},
        {
          session_id: 1,
          phone_number: 1,
          network_provider: 1,
          status: 1,
          action: 1,
          start_time: 1,
          duration: 1,
        },
      )
      .sort({ start_time: -1 })
      .limit(limit)
      .lean();

    return sessions.map((session) => ({
      sessionId: session.session_id,
      phoneNumber: this.maskPhoneNumber(session.phone_number),
      network: session.network_provider || 'UNKNOWN',
      status: session.status,
      action: session.action,
      startTime: session.start_time,
      duration: session.duration,
    }));
  }

  /**
   * Get real-time analytics (last hour)
   */
  async getRealTimeAnalytics(): Promise<UssdAnalyticsResponse> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const now = new Date();

    return await this.getUssdAnalytics(oneHourAgo, now);
  }

  /**
   * Get daily analytics
   */
  async getDailyAnalytics(): Promise<UssdAnalyticsResponse> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await this.getUssdAnalytics(startOfDay, endOfDay);
  }

  /**
   * Mask phone number for privacy (show only last 4 digits)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) {
      return phoneNumber;
    }
    return phoneNumber.slice(0, -4).replace(/./g, '*') + phoneNumber.slice(-4);
  }

  /**
   * Update session action (called when action is performed)
   */
  async updateSessionAction(sessionId: string, action: string): Promise<void> {
    try {
      await this.ussdSessionModel.updateOne(
        { session_id: sessionId },
        {
          $set: {
            action,
            last_menu: action,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating session action: ${error}`);
    }
  }

  /**
   * End session and calculate duration
   */
  async endSession(
    sessionId: string,
    status: 'completed' | 'terminated' | 'failed' = 'completed',
  ): Promise<void> {
    try {
      const session = await this.ussdSessionModel.findOne({
        session_id: sessionId,
      });

      if (session) {
        const endTime = new Date();
        const duration = Math.round(
          (endTime.getTime() - session.start_time.getTime()) / 1000,
        );

        await this.ussdSessionModel.updateOne(
          { session_id: sessionId },
          {
            $set: {
              status,
              end_time: endTime,
              duration,
            },
          },
        );
      }
    } catch (error) {
      this.logger.error(`Error ending session: ${error}`);
    }
  }
}
