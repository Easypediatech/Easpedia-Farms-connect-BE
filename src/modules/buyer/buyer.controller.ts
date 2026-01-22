import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BuyerService } from './buyer.service';
import { RegisterBuyerDto } from './dto/register-buyer.dto';
import { LoginBuyerDto } from './dto/login-buyer.dto';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import { BuyerResponseDto } from './dto/buyer-response.dto';
import { formatSuccessResponse } from '../../common/utils/response.util';

@ApiTags('Buyers')
@Controller('buyers')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new buyer',
    description: 'Create a new buyer account with phone number and 4-digit PIN',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Buyer registered successfully',
    type: BuyerResponseDto,
  })
  @ApiConflictResponse({ description: 'Phone number already registered' })
  @ApiBadRequestResponse({ description: 'Invalid PIN format (must be 4 digits)' })
  async register(@Body() registerBuyerDto: RegisterBuyerDto) {
    const buyer = await this.buyerService.register(registerBuyerDto);
    return formatSuccessResponse(buyer, 'Buyer registered successfully');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buyer login',
    description: 'Login with phone number and PIN',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: BuyerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid phone number or PIN',
  })
  async login(@Body() loginBuyerDto: LoginBuyerDto) {
    const buyer = await this.buyerService.login(loginBuyerDto);
    return formatSuccessResponse(buyer, 'Login successful');
  }

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change buyer PIN',
    description: 'Change 4-digit PIN for buyer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PIN changed successfully',
    type: BuyerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Buyer not found' })
  @ApiBadRequestResponse({ description: 'Current PIN is incorrect or invalid new PIN' })
  async changePin(
    @Query('phone') phone: string,
    @Body() changePinDto: ChangePinDto,
  ) {
    const buyer = await this.buyerService.changePin(phone, changePinDto);
    return formatSuccessResponse(buyer, 'PIN changed successfully');
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get buyer profile',
    description: 'Get buyer profile by phone number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Buyer profile retrieved',
    type: BuyerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Buyer not found' })
  async getProfile(@Query('phone') phone: string) {
    const buyer = await this.buyerService.getBuyerByPhone(phone);
    return formatSuccessResponse(buyer);
  }
}
