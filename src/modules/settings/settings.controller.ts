import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Headers,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from '../admin/dto/settings/update-settings.dto';
import { CreateSettingsDto } from '../admin/dto/settings/create-settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get system settings',
    description: 'Retrieve current system configuration settings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  async getSettings() {
    const settings = await this.settingsService.getSettings();

    return {
      success: true,
      data: settings,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create initial system settings',
    description: 'Create system settings if none exist.',
  })
  @ApiBody({ type: CreateSettingsDto })
  @ApiResponse({
    status: 201,
    description: 'Settings created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Settings already exist',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createSettings(@Body() settingsData: CreateSettingsDto) {
    const createdSettings =
      await this.settingsService.createSettings(settingsData);

    return {
      success: true,
      message: 'System settings created successfully!',
      data: createdSettings,
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update system settings',
    description: 'Update cassava pricing and payroll tax configuration.',
  })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateSettings(
    @Body() settingsData: UpdateSettingsDto,
    @Headers('authorization') authorization?: string,
  ) {
    // Extract admin ID from token - simplified for now
    const adminId = 'admin'; // TODO: Extract from JWT token properly

    const updatedSettings = await this.settingsService.updateSettings(
      settingsData,
      adminId,
    );

    return {
      success: true,
      message: 'Cassava pricing settings have been updated successfully!',
      data: updatedSettings,
    };
  }

  @Get('cassava-pricing')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cassava pricing',
    description: 'Retrieve current cassava pricing configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cassava pricing retrieved successfully',
  })
  async getCassavaPricing() {
    const settings = await this.settingsService.getSettings();

    return {
      success: true,
      data: {
        cassavaPricePerKg: Math.round(settings.cassavaPricePerKg / 100), // Convert from kobo to naira
        cassavaPricePerTon: Math.round(settings.cassavaPricePerTon / 100), // Convert from kobo to naira
      },
    };
  }
}
