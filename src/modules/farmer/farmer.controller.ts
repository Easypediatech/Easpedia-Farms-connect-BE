import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { FarmerService } from './farmer.service';
import { RegisterFarmerDto } from './dto/register-farmer.dto';
import { LoginFarmerDto } from './dto/login-farmer.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { FarmerResponseDto } from './dto/farmer-response.dto';
import { GetAllFarmersDto } from './dto/get-all-farmers.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { FarmerDetailDto } from './dto/farmer-detail.dto';
import { PaginatedFarmersDto } from './dto/paginated-farmers.dto';
import { formatSuccessResponse } from '../../common/utils/response.util';

@ApiTags('Farmers')
@Controller('farmers')
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new farmer',
    description: 'Create a new farmer account with phone number and 4-digit PIN',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Farmer registered successfully',
    type: FarmerResponseDto,
  })
  @ApiConflictResponse({ description: 'Phone number already registered' })
  @ApiBadRequestResponse({ description: 'Invalid PIN format (must be 4 digits)' })
  async register(@Body() registerFarmerDto: RegisterFarmerDto) {
    const farmer = await this.farmerService.register(registerFarmerDto);
    return formatSuccessResponse(farmer, 'Farmer registered successfully');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Farmer login',
    description: 'Login with phone number and PIN',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: FarmerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid phone number or PIN',
  })
  async login(@Body() loginFarmerDto: LoginFarmerDto) {
    const farmer = await this.farmerService.login(loginFarmerDto);
    return formatSuccessResponse(farmer, 'Login successful');
  }

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change farmer PIN',
    description: 'Change 4-digit PIN for farmer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PIN changed successfully',
    type: FarmerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  @ApiBadRequestResponse({ description: 'Current PIN is incorrect or invalid new PIN' })
  async changePin(
    @Query('phone') phone: string,
    @Body() changePinDto: ChangePinDto,
  ) {
    const farmer = await this.farmerService.changePin(phone, changePinDto);
    return formatSuccessResponse(farmer, 'PIN changed successfully');
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get farmer profile',
    description: 'Get farmer profile by phone number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmer profile retrieved',
    type: FarmerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  async getProfile(@Query('phone') phone: string) {
    const farmer = await this.farmerService.getFarmerByPhone(phone);
    return formatSuccessResponse(farmer);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all farmers',
    description: 'Get paginated list of farmers with optional filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'banned'] })
  @ApiQuery({ name: 'lga', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmers retrieved successfully',
    type: PaginatedFarmersDto,
  })
  async getAllFarmers(@Query() query: GetAllFarmersDto) {
    const result = await this.farmerService.getAllFarmers(query);
    return formatSuccessResponse(result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get farmer by ID',
    description: 'Get detailed farmer information by farmer ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmer details retrieved',
    type: FarmerDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  async getFarmerById(@Param('id') id: string) {
    const farmer = await this.farmerService.getFarmerById(id);
    return formatSuccessResponse(farmer);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update farmer',
    description: 'Update farmer profile information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmer updated successfully',
    type: FarmerDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  async updateFarmer(
    @Param('id') id: string,
    @Body() updateFarmerDto: UpdateFarmerDto,
  ) {
    const farmer = await this.farmerService.updateFarmer(id, updateFarmerDto);
    return formatSuccessResponse(farmer, 'Farmer updated successfully');
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate farmer',
    description: 'Suspend or ban a farmer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmer deactivated successfully',
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  async deactivateFarmer(@Param('id') id: string) {
    await this.farmerService.deactivateFarmer(id);
    return formatSuccessResponse(null, 'Farmer deactivated successfully');
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate farmer',
    description: 'Reactivate a suspended or banned farmer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farmer activated successfully',
  })
  @ApiNotFoundResponse({ description: 'Farmer not found' })
  async activateFarmer(@Param('id') id: string) {
    await this.farmerService.activateFarmer(id);
    return formatSuccessResponse(null, 'Farmer activated successfully');
  }
}
