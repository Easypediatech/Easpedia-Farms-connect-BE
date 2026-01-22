import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';

export interface SettingsResponseDto {
  cassavaPricePerKg: number;
  cassavaPricePerTon: number;
  taxRate: number;
  lastUpdated: Date;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  /**
   * Get system settings
   * Creates default settings if none exist
   */
  async getSettings(): Promise<SettingsResponseDto> {
    let settings = await this.settingsModel.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await this.settingsModel.create({
        cassavaPricePerKg: 50000,
        cassavaPricePerTon: 45000000,
        taxRate: 0.0,
      });
    }
    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      taxRate: settings.taxRate,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Create initial system settings
   * Only creates if no settings exist
   */
  async createSettings(createSettingsDto: any): Promise<SettingsResponseDto> {
    const existingSettings = await this.settingsModel.findOne();
    if (existingSettings) {
      throw new BadRequestException(
        'Settings already exist. Use update instead.',
      );
    }
    const settings = await this.settingsModel.create({
      cassavaPricePerKg: createSettingsDto.cassavaPricePerKg || 50000,
      cassavaPricePerTon: createSettingsDto.cassavaPricePerTon || 45000000,
      taxRate: createSettingsDto.taxRate || 0.0,
      lastUpdated: new Date(),
    });
    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      taxRate: settings.taxRate,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update system settings
   */
  async updateSettings(
    updateSettingsDto: any,
    adminId: string,
  ): Promise<SettingsResponseDto> {
    let settings = await this.settingsModel.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await this.settingsModel.create({
        cassavaPricePerKg: updateSettingsDto.cassavaPricePerKg || 50000,
        cassavaPricePerTon: updateSettingsDto.cassavaPricePerTon || 45000000,
        taxRate: updateSettingsDto.taxRate || 0.0,
        lastUpdated: new Date(),
        updatedBy: adminId,
      });
    } else {
      // Update existing settings
      if (updateSettingsDto.cassavaPricePerKg !== undefined) {
        settings.cassavaPricePerKg = updateSettingsDto.cassavaPricePerKg;
      }
      if (updateSettingsDto.cassavaPricePerTon !== undefined) {
        settings.cassavaPricePerTon = updateSettingsDto.cassavaPricePerTon;
      }
      if (updateSettingsDto.taxRate !== undefined) {
        settings.taxRate = updateSettingsDto.taxRate;
      }
      settings.lastUpdated = new Date();
      settings.updatedBy = adminId;
      settings.updatedAt = new Date();
      await settings.save();
    }
    return {
      cassavaPricePerKg: settings.cassavaPricePerKg,
      cassavaPricePerTon: settings.cassavaPricePerTon,
      taxRate: settings.taxRate,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
