import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { FundOrganizationWalletDto } from './dto/fund-organization-wallet.dto';
import { formatSuccessResponse } from '../../common/utils/response.util';

@ApiTags('Admin Wallet')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admins/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('organization')
  @ApiOperation({ summary: 'Get organization/payroll wallet' })
  @ApiResponse({
    status: 200,
    description: 'Organization wallet retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Organization wallet not found' })
  async getOrganizationWallet() {
    const wallet = await this.walletService.getOrganizationWallet();
    if (!wallet) {
      throw new NotFoundException('Organization wallet not found. Please create one first.');
    }
    return formatSuccessResponse(wallet, 'Organization wallet retrieved successfully');
  }

  @Post('organization/fund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund organization/payroll wallet' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  @ApiBadRequestResponse({ description: 'Invalid funding amount' })
  @ApiNotFoundResponse({ description: 'Organization wallet not found' })
  async fundOrganizationWallet(@Body() fundWalletDto: FundOrganizationWalletDto) {
    const wallet = await this.walletService.fundOrganizationWallet(
      fundWalletDto.amount,
      fundWalletDto.reason,
    );
    return formatSuccessResponse(wallet, 'Wallet funded successfully');
  }

  @Post('organization/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create organization/payroll wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  async createOrganizationWallet(@Body() body: { organization_name: string }) {
    const wallet = await this.walletService.createOrganizationWallet(
      body.organization_name || 'Organization Payroll Wallet',
    );
    return formatSuccessResponse(wallet, 'Organization wallet created successfully');
  }
}
