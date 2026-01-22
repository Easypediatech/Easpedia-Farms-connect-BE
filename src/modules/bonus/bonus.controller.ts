import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { BonusService } from './bonus.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FundBonusWalletDto } from './dto/fund-bonus-wallet.dto';
import { AssignBonusDto } from './dto/assign-bonus.dto';
import { TransferBonusDto } from './dto/transfer-bonus.dto';
import { formatSuccessResponse } from '../../common/utils/response.util';

@ApiTags('Admin Bonus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admins/bonus')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get organization bonus wallet' })
  @ApiResponse({
    status: 200,
    description: 'Organization bonus wallet retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Organization bonus wallet not found' })
  async getOrganizationBonusWallet() {
    const wallet = await this.bonusService.getOrganizationBonusWallet();
    if (!wallet) {
      throw new NotFoundException('Organization bonus wallet not found. Please create one first.');
    }
    return formatSuccessResponse(wallet, 'Organization bonus wallet retrieved successfully');
  }

  @Post('wallet/fund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund organization bonus wallet' })
  @ApiResponse({ status: 200, description: 'Bonus wallet funded successfully' })
  @ApiBadRequestResponse({ description: 'Invalid funding amount' })
  @ApiNotFoundResponse({ description: 'Organization bonus wallet not found' })
  async fundOrganizationBonusWallet(@Body() fundBonusWalletDto: FundBonusWalletDto) {
    const wallet = await this.bonusService.fundOrganizationBonusWallet(fundBonusWalletDto);
    return formatSuccessResponse(wallet, 'Bonus wallet funded successfully');
  }

  @Post('wallet/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create organization bonus wallet' })
  @ApiResponse({ status: 201, description: 'Bonus wallet created successfully' })
  async createOrganizationBonusWallet(@Body() body: { organization_name: string }) {
    const wallet = await this.bonusService.createOrganizationBonusWallet(
      body.organization_name || 'Organization Bonus Wallet',
    );
    return formatSuccessResponse(wallet, 'Organization bonus wallet created successfully');
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign bonuses to staff' })
  @ApiResponse({ status: 200, description: 'Bonuses assigned successfully' })
  @ApiBadRequestResponse({ description: 'Invalid assignment data or insufficient funds' })
  async assignBonuses(@Body() assignBonusDto: AssignBonusDto) {
    const result = await this.bonusService.assignBonuses(assignBonusDto);
    return formatSuccessResponse(result, 'Bonuses assigned successfully');
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer staff bonus to main wallet' })
  @ApiResponse({ status: 200, description: 'Bonus transferred successfully' })
  @ApiBadRequestResponse({ description: 'Invalid transfer data or insufficient bonus balance' })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async transferBonusToWallet(@Body() transferBonusDto: TransferBonusDto) {
    const wallet = await this.bonusService.transferBonusToWallet(transferBonusDto);
    return formatSuccessResponse(wallet, 'Bonus transferred to main wallet successfully');
  }

  @Get('staff/:staffId/balance')
  @ApiOperation({ summary: 'Get staff bonus balance' })
  @ApiResponse({ status: 200, description: 'Staff bonus balance retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Staff not found' })
  async getStaffBonusBalance(@Param('staffId') staffId: string) {
    const bonusBalance = await this.bonusService.getStaffBonusBalance(staffId);
    return formatSuccessResponse({ bonusBalance }, 'Staff bonus balance retrieved successfully');
  }

  @Get('staff/balances')
  @ApiOperation({ summary: 'Get all staff with their bonus balances' })
  @ApiResponse({ status: 200, description: 'Staff bonus balances retrieved successfully' })
  async getAllStaffBonusBalances() {
    const staffBonuses = await this.bonusService.getAllStaffBonusBalances();
    return formatSuccessResponse(staffBonuses, 'Staff bonus balances retrieved successfully');
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get bonus transactions with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['bonus_wallet_funding', 'bonus_allocation', 'bonus_transfer'],
  })
  @ApiQuery({ name: 'staffId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getBonusTransactions(@Query() query: any) {
    const result = await this.bonusService.getBonusTransactions({
      page: query?.page ? Number(query.page) : 1,
      limit: query?.limit ? Number(query.limit) : 20,
      type: query?.type,
      staffId: query?.staffId,
      search: query?.search,
    });

    return formatSuccessResponse(result, 'Bonus transactions retrieved successfully');
  }
}