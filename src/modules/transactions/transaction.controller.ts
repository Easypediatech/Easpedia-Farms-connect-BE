import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { createResponse } from '../../common/utils/response.util';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin Transactions')
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all transactions with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getAllTransactions(@Query() query: GetTransactionsQueryDto) {
    try {
      const result = await this.transactionService.getAllTransactions(query);

      return createResponse(
        true,
        'Transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getWalletTransactions(@Query() query: GetTransactionsQueryDto) {
    try {
      const result = await this.transactionService.getTransactionsByType(
        'wallet',
        query,
      );

      return createResponse(
        true,
        'Wallet transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve wallet transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('loans')
  @ApiOperation({ summary: 'Get loan transactions' })
  @ApiResponse({
    status: 200,
    description: 'Loan transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getLoanTransactions(@Query() query: GetTransactionsQueryDto) {
    try {
      const result = await this.transactionService.getTransactionsByType(
        'loan',
        query,
      );

      return createResponse(
        true,
        'Loan transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve loan transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Get purchase transactions' })
  @ApiResponse({
    status: 200,
    description: 'Purchase transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getPurchaseTransactions(@Query() query: GetTransactionsQueryDto) {
    try {
      const result = await this.transactionService.getTransactionsByType(
        'purchase',
        query,
      );

      return createResponse(
        true,
        'Purchase transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve purchase transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({
    status: 200,
    description: 'Transaction statistics retrieved successfully',
  })
  async getTransactionStats() {
    try {
      const stats = await this.transactionService.getTransactionStats();

      return createResponse(
        true,
        'Transaction statistics retrieved successfully',
        stats,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve transaction statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get organization wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Organization transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getOrganizationTransactions(@Query() query: GetTransactionsQueryDto) {
    try {
      const result = await this.transactionService.getOrganizationTransactions(query);

      return createResponse(
        true,
        'Organization transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve organization transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get transactions for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User transactions retrieved successfully',
    type: [TransactionResponseDto],
  })
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query() query: GetTransactionsQueryDto,
  ) {
    try {
      console.log(`Getting transactions for userId: ${userId}`);
      
      // Create a direct filter for user_id instead of using search
      const result = await this.transactionService.getUserTransactionsByUserId(userId, query);
        
      console.log('getUserTransactions result:', {
        transactionCount: result.transactions.length,
        total: result.total,
        page: result.page,
      });

      return createResponse(
        true,
        'User transactions retrieved successfully',
        result,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve user transactions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('farmer/:farmerId/financial-status')
  @ApiOperation({ summary: 'Get farmer financial status for admin' })
  @ApiResponse({
    status: 200,
    description: 'Farmer financial status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Farmer not found',
  })
  async getFarmerFinancialStatus(@Param('farmerId') farmerId: string) {
    try {
      const financialStatus = await this.transactionService.getFarmerFinancialStatus(farmerId);

      return createResponse(
        true,
        'Farmer financial status retrieved successfully',
        financialStatus,
      );
    } catch (error) {
      throw new HttpException(
        {
          status: false,
          message: 'Failed to retrieve farmer financial status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
