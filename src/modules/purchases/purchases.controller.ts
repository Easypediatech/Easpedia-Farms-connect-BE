import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GetPurchasesQueryDto } from './dto/get-purchases-query.dto';

@ApiTags('purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase record' })
  @ApiResponse({ status: 201, description: 'Purchase created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createPurchase(
    @Body() createPurchaseDto: CreatePurchaseDto,
    @Request() req,
  ) {
    // Extract admin ID from JWT token in real implementation
    const recordedById = req.user?.id || 'admin';
    return this.purchasesService.createPurchase(
      createPurchaseDto,
      recordedById,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all purchases with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Purchases retrieved successfully' })
  async getAllPurchases(@Query() queryDto: GetPurchasesQueryDto) {
    return this.purchasesService.getAllPurchases(queryDto);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get purchase KPIs and statistics' })
  @ApiResponse({ status: 200, description: 'KPIs retrieved successfully' })
  async getKPIs() {
    return this.purchasesService.getKPIs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase by ID' })
  @ApiResponse({ status: 200, description: 'Purchase found' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async getPurchaseById(@Param('id') id: string) {
    return this.purchasesService.getPurchaseById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update purchase status' })
  @ApiResponse({ status: 200, description: 'Purchase status updated' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async updatePurchaseStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.purchasesService.updatePurchaseStatus(id, body.status);
  }

  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { paymentStatus: string },
  ) {
    return this.purchasesService.updatePaymentStatus(id, body.paymentStatus);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed purchase' })
  @ApiResponse({ status: 200, description: 'Purchase retried successfully' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  @ApiResponse({ status: 400, description: 'Purchase is not in failed status' })
  async retryPurchase(@Param('id') id: string) {
    const retriedPurchase = await this.purchasesService.retryPurchase(id);
    return {
      success: true,
      message: 'Purchase retried successfully',
      data: retriedPurchase,
    };
  }

  @Get('debug/farmer/:farmerId/financial-status')
  @ApiOperation({ summary: 'Get farmer financial status for debugging' })
  @ApiResponse({
    status: 200,
    description: 'Farmer financial status retrieved',
  })
  @ApiResponse({ status: 404, description: 'Farmer not found' })
  async getFarmerFinancialStatus(@Param('farmerId') farmerId: string) {
    return this.purchasesService.getFarmerFinancialStatus(farmerId);
  }
}
