import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { FarmerRepository } from './farmer.repository';
import { RegisterFarmerDto } from './dto/register-farmer.dto';
import { LoginFarmerDto } from './dto/login-farmer.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { FarmerResponseDto } from './dto/farmer-response.dto';
import { GetAllFarmersDto } from './dto/get-all-farmers.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { FarmerDetailDto } from './dto/farmer-detail.dto';
import { PaginatedFarmersDto } from './dto/paginated-farmers.dto';
import { plainToInstance } from 'class-transformer';
import {
    DuplicatePhoneException,
    InvalidPinException,
} from '../../common/exceptions';
import {
    comparePin,
    isValidPin,
    normalizePhoneNumber,
    formatPhoneForSms,
    hashPin,
} from '../../common/utils/pin.util';
import { SmsService } from '../../common/services/sms.service';
import { WalletService } from '../wallet/wallet.service';
import { InjectModel } from '@nestjs/mongoose';
import { Purchase } from '../../schemas/purchase.schema';
import { Model } from 'mongoose';

@Injectable()
export class FarmerService {
    private readonly logger = new Logger(FarmerService.name);

    constructor(
        private readonly farmerRepository: FarmerRepository,
        private readonly smsService: SmsService,
        private readonly walletService: WalletService,
        @InjectModel(Purchase.name) private readonly purchaseModel: Model<Purchase>,
    ) { }

    /**
     * Auto-register farmer using DOJAH NIMC verification
     * TODO: Integrate with DOJAH API
     *
     * @param phone - Phone number
     * @param pin - 4-digit PIN
     * @returns Farmer response
     */
    async autoRegister(phone: string, pin: string): Promise<FarmerResponseDto> {
        this.logger.log(`Auto-registering farmer with NIMC verification: ${phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);

        // Check if phone already exists
        const existingUser =
            await this.farmerRepository.findUserByPhone(normalizedPhone);
        if (existingUser) {
            throw new DuplicatePhoneException(normalizedPhone);
        }

        // TODO: Integrate with DOJAH API for NIMC verification
        // const dojahResponse = await axios.get(
        //   `${process.env.DOJAH_API_URL}/api/v1/kyc/phone_number/basic?phone_number=0${normalizedPhone}`,
        //   {
        //     headers: {
        //       Authorization: process.env.DOJAH_PRIVATE_KEY,
        //       AppId: process.env.DOJAH_APP_ID,
        //       'Content-Type': 'application/json',
        //     },
        //   },
        // );
        //
        // const person = dojahResponse.data.entity;
        // const firstName = person.firstName;
        // const lastName = person.lastName;
        // const state = person.addressState;
        // const lga = person.addressCity;

        // For now, use placeholder data
        const registerDto: RegisterFarmerDto = {
            phone: normalizedPhone,
            pin,
            firstName: 'Auto',
            lastName: 'Farmer',
            state: 'Lagos',
            lga: 'Ikeja',
            farmSize: 1.0,
        };

        return this.register(registerDto);
    }

    /**
     * Register a new farmer
     *
     * @param registerFarmerDto - Farmer registration data
     * @returns Farmer response
     * @throws DuplicatePhoneException if phone exists
     * @throws BadRequestException if PIN is invalid
     */
    async register(
        registerFarmerDto: RegisterFarmerDto,
    ): Promise<FarmerResponseDto> {
        this.logger.log(`Registering farmer: ${registerFarmerDto.phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(
            registerFarmerDto.phone,
        );
        registerFarmerDto.phone = normalizedPhone;

        // Check if phone already exists
        const existingUser =
            await this.farmerRepository.findUserByPhone(normalizedPhone);
        if (existingUser) {
            // Check if this is an orphaned user record (user exists but farmer profile missing)
            const existingFarmer = await this.farmerRepository.findFarmerByUserId(
                existingUser._id.toString(),
            );

            if (existingFarmer) {
                // Complete registration exists
                this.logger.warn(`Registration attempt for existing farmer: ${normalizedPhone}`);
                throw new DuplicatePhoneException(normalizedPhone);
            } else {
                // Orphaned user record - clean it up and allow re-registration
                this.logger.warn(
                    `Cleaning up orphaned user record for phone: ${normalizedPhone} (User ID: ${existingUser._id})`
                );
                await this.farmerRepository.deleteUser(existingUser._id.toString());
            }
        }

        // Validate PIN
        if (!isValidPin(registerFarmerDto.pin)) {
            throw new BadRequestException('PIN must be exactly 4 digits');
        }

        // Create farmer (password will be hashed by pre-save hook)
        const { user, farmer } =
            await this.farmerRepository.createFarmer(registerFarmerDto);

        this.logger.log(`Farmer registered successfully: ${user.phone}`);

        // Create wallet for farmer
        await this.walletService.createWallet(user._id, 'farmer');
        this.logger.log(`Wallet created for farmer: ${String(user._id)}`);

        // Send welcome SMS
        const phoneForSms = formatPhoneForSms(user.phone, user.phone_code);
        await this.smsService.sendFarmerWelcomeSms(
            registerFarmerDto.firstName,
            phoneForSms,
        );

        // Get enhanced financial data for response
        const enhancedData = await this.enhanceFarmerWithFinancialData(farmer, user);

        return this.transformToResponseDto(enhancedData.farmer, enhancedData.user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Farmer login
     *
     * @param loginFarmerDto - Login credentials
     * @returns Farmer response
     * @throws InvalidPinException if credentials are invalid
     */
    async login(loginFarmerDto: LoginFarmerDto): Promise<FarmerResponseDto> {
        this.logger.log(`Farmer login attempt: ${loginFarmerDto.phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(
            loginFarmerDto.phone,
        );

        // Find user
        const user = await this.farmerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            throw new InvalidPinException();
        }

        // Check if user is a farmer
        if (user.user_type !== 'farmer') {
            throw new InvalidPinException();
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new BadRequestException('Account is suspended or banned');
        }

        // Verify PIN
        const isPinValid = await comparePin(loginFarmerDto.pin, user.password);
        if (!isPinValid) {
            throw new InvalidPinException();
        }

        // Update last login
        await this.farmerRepository.updateUser(user._id.toString(), {
            last_login: new Date(),
            last_activity: new Date(),
        } as any);

        // Get farmer profile
        const farmer = await this.farmerRepository.findFarmerByUserId(
            user._id.toString(),
        );
        if (!farmer) {
            throw new NotFoundException('Farmer profile not found');
        }

        this.logger.log(`Farmer logged in successfully: ${user.phone}`);

        // Get enhanced financial data
        const enhancedData = await this.enhanceFarmerWithFinancialData(farmer, user);

        return this.transformToResponseDto(enhancedData.farmer, enhancedData.user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Change farmer PIN
     *
     * @param phone - Phone number
     * @param changePinDto - PIN change data
     * @returns Farmer response
     * @throws NotFoundException if farmer not found
     * @throws BadRequestException if current PIN is incorrect or new PIN is invalid
     */
    async changePin(
        phone: string,
        changePinDto: ChangePinDto,
    ): Promise<FarmerResponseDto> {
        this.logger.log(`Changing PIN for farmer: ${phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);

        // Find user
        const user = await this.farmerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            throw new NotFoundException(
                `Farmer with phone ${normalizedPhone} not found`,
            );
        }

        // Verify current PIN
        const isCurrentPinValid = await comparePin(
            changePinDto.currentPin,
            user.password,
        );
        if (!isCurrentPinValid) {
            throw new BadRequestException('Current PIN is incorrect');
        }

        // Validate new PIN
        if (!isValidPin(changePinDto.newPin)) {
            throw new BadRequestException('New PIN must be exactly 4 digits');
        }

        // Check if new PIN is same as current PIN
        if (changePinDto.newPin === changePinDto.currentPin) {
            throw new BadRequestException(
                'New PIN must be different from current PIN',
            );
        }

        // Update PIN (will be hashed by pre-save hook if we use save(), but findByIdAndUpdate doesn't trigger it)
        // So we need to hash it manually or use save()
        const hashedPin = await hashPin(changePinDto.newPin);

        await this.farmerRepository.updateUser(user._id.toString(), {
            password: hashedPin,
        } as any);

        // Get farmer profile
        const farmer = await this.farmerRepository.findFarmerByUserId(
            user._id.toString(),
        );
        if (!farmer) {
            throw new NotFoundException('Farmer profile not found');
        }

        this.logger.log(`PIN changed successfully for farmer: ${phone}`);

        // Send confirmation SMS
        const phoneForSms = formatPhoneForSms(user.phone, user.phone_code);
        await this.smsService.sendPinChangeSms(farmer.first_name, phoneForSms);

        // Get enhanced financial data for response
        const enhancedData = await this.enhanceFarmerWithFinancialData(farmer, user);

        return this.transformToResponseDto(enhancedData.farmer, enhancedData.user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Get farmer by phone number
     *
     * @param phone - Phone number
     * @returns Farmer response
     * @throws NotFoundException if farmer not found
     */
    async getFarmerByPhone(phone: string): Promise<FarmerResponseDto> {
        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);
        this.logger.log(`[getFarmerByPhone] Input: ${phone} -> Normalized: ${normalizedPhone}`);

        const user = await this.farmerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            this.logger.warn(`[getFarmerByPhone] User not found for phone: ${normalizedPhone}`);
            throw new NotFoundException(
                `Farmer with phone ${normalizedPhone} not found`,
            );
        }

        this.logger.log(`[getFarmerByPhone] User found: ${user._id}`);
        const farmer = await this.farmerRepository.findFarmerByUserId(
            user._id.toString(),
        );
        if (!farmer) {
            // Handle orphaned user record (user exists but farmer profile missing)
            this.logger.error(
                `[getFarmerByPhone] ORPHANED USER RECORD DETECTED: User ${user._id} exists but farmer profile missing for phone: ${normalizedPhone}`
            );

            // For now, treat as "not found" so user can re-register
            // TODO: Consider auto-cleanup of orphaned user records
            throw new NotFoundException(
                `Farmer profile not found for phone ${normalizedPhone}. Please register again.`,
            );
        }

        // Get enhanced financial data for response
        const enhancedData = await this.enhanceFarmerWithFinancialData(farmer, user);

        return this.transformToResponseDto(enhancedData.farmer, enhancedData.user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Get all farmers with pagination
     *
     * @param getAllFarmersDto - Pagination and filter options
     * @returns Paginated farmers list
     */
    async getAllFarmers(
        getAllFarmersDto: GetAllFarmersDto,
    ): Promise<PaginatedFarmersDto> {
        const { page = 1, limit = 10, search, status, lga } = getAllFarmersDto;

        this.logger.log(`Getting all farmers - page: ${page}, limit: ${limit}`);

        const { farmers, total } = await this.farmerRepository.findAllFarmers({
            page,
            limit,
            search,
            status,
            lga,
        });

        // Enhance farmers with wallet and purchase statistics
        this.logger.log(`[getAllFarmers] Enhancing ${farmers.length} farmers with financial data`);
        const enhancedFarmers = await Promise.all(
            farmers.map(async ({ farmer, user, wallet }, index) => {
                this.logger.log(`[getAllFarmers] Processing farmer ${index + 1}/${farmers.length}: ${farmer._id}`);
                const walletBalance = wallet ? wallet.balance : 0;
                const purchaseStats = await this.calculatePurchaseStatistics(farmer._id.toString());
                const result = this.transformToResponseDto(farmer, user, walletBalance, purchaseStats);
                this.logger.log(`[getAllFarmers] Farmer ${farmer._id} enhanced - walletBalance: ${result.walletBalance}`);
                return result;
            })
        );

        this.logger.log(`[getAllFarmers] All farmers enhanced. Sample farmer walletBalance: ${enhancedFarmers[0]?.walletBalance}`);

        const totalPages = Math.ceil(total / limit);

        return {
            data: enhancedFarmers,
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }

    /**
     * Get farmer by ID with detailed information
     *
     * @param farmerId - Farmer ID
     * @returns Farmer detail DTO
     * @throws NotFoundException if farmer not found
     */
    async getFarmerById(farmerId: string): Promise<FarmerDetailDto> {
        this.logger.log(`Getting farmer by ID: ${farmerId}`);

        const result = await this.farmerRepository.findFarmerById(farmerId);
        if (!result) {
            throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
        }

        const { farmer, user } = result;

        // Get enhanced financial data
        const enhancedData = await this.enhanceFarmerWithFinancialData(farmer, user);

        return this.transformToDetailDto(farmer, user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Update farmer information
     *
     * @param farmerId - Farmer ID
     * @param updateFarmerDto - Update data
     * @returns Updated farmer detail DTO
     * @throws NotFoundException if farmer not found
     */
    async updateFarmer(
        farmerId: string,
        updateFarmerDto: UpdateFarmerDto,
    ): Promise<FarmerDetailDto> {
        this.logger.log(`Updating farmer: ${farmerId}`);

        const result = await this.farmerRepository.findFarmerById(farmerId);
        if (!result) {
            throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
        }

        // Update farmer profile
        const updateData: any = {};
        if (updateFarmerDto.firstName) {
            updateData.first_name = updateFarmerDto.firstName;
        }
        if (updateFarmerDto.lastName) {
            updateData.last_name = updateFarmerDto.lastName;
        }
        if (updateFarmerDto.lga) {
            updateData.lga = updateFarmerDto.lga;
        }
        if (updateFarmerDto.farmSize) {
            updateData.farm_size_hectares = updateFarmerDto.farmSize;
        }

        const updatedFarmer = await this.farmerRepository.updateFarmer(
            farmerId,
            updateData,
        );

        if (!updatedFarmer) {
            throw new NotFoundException('Failed to update farmer');
        }

        // Get wallet balance
        let walletBalance = 0;
        try {
            const wallet = await this.walletService.getWallet(result.user._id as any);
            walletBalance = wallet.balance;
        } catch (error) {
            this.logger.warn(`Wallet not found for farmer: ${farmerId}`);
        }

        this.logger.log(`Farmer updated successfully: ${farmerId}`);

        // Get enhanced financial data for response
        const enhancedData = await this.enhanceFarmerWithFinancialData(updatedFarmer, result.user);

        return this.transformToDetailDto(updatedFarmer, result.user, enhancedData.walletBalance, enhancedData.purchaseStats);
    }

    /**
     * Deactivate farmer account (suspend)
     *
     * @param farmerId - Farmer ID
     * @throws NotFoundException if farmer not found
     */
    async deactivateFarmer(farmerId: string): Promise<void> {
        this.logger.log(`Deactivating farmer: ${farmerId}`);

        const result = await this.farmerRepository.findFarmerById(farmerId);
        if (!result) {
            throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
        }

        await this.farmerRepository.updateUser(result.user._id.toString(), {
            status: 'suspended',
        } as any);

        this.logger.log(`Farmer deactivated successfully: ${farmerId}`);
    }

    /**
     * Activate farmer account
     *
     * @param farmerId - Farmer ID
     * @throws NotFoundException if farmer not found
     */
    async activateFarmer(farmerId: string): Promise<void> {
        this.logger.log(`Activating farmer: ${farmerId}`);

        const result = await this.farmerRepository.findFarmerById(farmerId);
        if (!result) {
            throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
        }

        await this.farmerRepository.updateUser(result.user._id.toString(), {
            status: 'active',
        } as any);

        this.logger.log(`Farmer activated successfully: ${farmerId}`);
    }

    /**
     * Update farmer sales statistics when a purchase is completed
     *
     * @param farmerId - Farmer ID
     * @param saleAmount - Sale amount in kobo
     * @param weightKg - Weight sold in kg
     * @throws NotFoundException if farmer not found
     */
    async updateSalesStatistics(
        farmerId: string,
        saleAmount: number,
        weightKg: number,
    ): Promise<void> {
        this.logger.log(`Updating sales statistics for farmer: ${farmerId}, amount: ${saleAmount}, weight: ${weightKg}kg`);

        const farmer = await this.farmerRepository.findFarmerById(farmerId);
        if (!farmer) {
            throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
        }

        // Update farmer's sales statistics
        const updateData = {
            $inc: {
                total_sales: 1, // Increment number of sales
                total_earnings: saleAmount, // Add to total earnings in kobo
                completed_sales: 1, // Increment completed sales count
            },
        };

        await this.farmerRepository.updateFarmerRaw(farmerId, updateData);

        this.logger.log(`Sales statistics updated for farmer: ${farmerId}`);
    }

    /**
     * Transform farmer and user entities to response DTO
     *
     * @param farmer - Farmer entity
     * @param user - User entity
     * @param walletBalance - Wallet balance in kobo (optional)
     * @param purchaseStats - Purchase statistics (optional)
     * @returns Farmer response DTO
     */
    private transformToResponseDto(farmer: any, user: any, walletBalance?: number, purchaseStats?: any): FarmerResponseDto {
        this.logger.log(`[transformToResponseDto] Starting transformation for farmer ${farmer._id}`);
        this.logger.log(`[transformToResponseDto] Input parameters - walletBalance: ${walletBalance}, purchaseStats: ${JSON.stringify(purchaseStats)}`);

        // Convert Mongoose documents to plain objects
        const farmerObj = farmer.toObject ? farmer.toObject() : farmer;
        const userObj = user.toObject ? user.toObject() : user;

        const combined = {
            ...farmerObj,
            phone: userObj.phone,
            phone_code: userObj.phone_code,
            status: userObj.status,
            wallet_balance: walletBalance ?? 0,
            // Override with calculated stats if provided
            total_sales: purchaseStats?.totalSales ?? farmerObj.total_sales ?? 0,
            total_earnings: purchaseStats?.totalEarnings ?? farmerObj.total_earnings ?? 0,
            completed_sales: purchaseStats?.completedSales ?? farmerObj.completed_sales ?? 0,
        };

        this.logger.log(`[transformToResponseDto] Combined object wallet_balance: ${combined.wallet_balance}`);
        this.logger.log(`[transformToResponseDto] Combined object keys: ${Object.keys(combined).join(', ')}`);

        const result = plainToInstance(FarmerResponseDto, combined, {
            excludeExtraneousValues: true,
        });

        this.logger.log(`[transformToResponseDto] Final DTO result walletBalance: ${result.walletBalance}`);
        this.logger.log(`[transformToResponseDto] Final DTO keys: ${Object.keys(result).join(', ')}`);

        return result;
    }

    /**
     * Enhance farmer with financial data (wallet and purchase statistics)
     */
    private async enhanceFarmerWithFinancialData(farmer: any, user: any) {
        this.logger.log(`[enhanceFarmerWithFinancialData] Starting for farmer ${farmer._id}, user ${user._id}`);

        // Get wallet balance
        let walletBalance = 0;
        try {
            this.logger.log(`[enhanceFarmerWithFinancialData] Calling walletService.getWallet with user ID: ${user._id}`);
            const wallet = await this.walletService.getWallet(user._id as any);
            walletBalance = wallet.balance;
            this.logger.log(`[enhanceFarmerWithFinancialData] Wallet found - Balance: ${walletBalance} kobo for farmer ${farmer._id}`);
        } catch (error) {
            this.logger.error(`[enhanceFarmerWithFinancialData] Wallet retrieval failed for farmer: ${farmer._id}, user: ${user._id}. Error: ${error.message}`);
            this.logger.error(`[enhanceFarmerWithFinancialData] Error stack: ${error.stack}`);
        }

        // Get purchase statistics
        this.logger.log(`[enhanceFarmerWithFinancialData] Calculating purchase statistics for farmer ${farmer._id}`);
        const purchaseStats = await this.calculatePurchaseStatistics(farmer._id.toString());
        this.logger.log(`[enhanceFarmerWithFinancialData] Purchase stats calculated: ${JSON.stringify(purchaseStats)}`);

        const result = {
            farmer,
            user,
            walletBalance,
            purchaseStats,
        };

        this.logger.log(`[enhanceFarmerWithFinancialData] Returning enhanced data: walletBalance=${walletBalance}, stats=${JSON.stringify(purchaseStats)}`);
        return result;
    }

    /**
     * Calculate purchase statistics for a farmer
     */
    private async calculatePurchaseStatistics(farmerId: string) {
        try {
            const completedPurchases = await this.purchaseModel.find({
                farmerId,
                status: 'completed',
                paymentStatus: 'paid'
            });

            const totalSales = completedPurchases.length;
            const totalEarnings = completedPurchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);

            return {
                totalSales,
                totalEarnings, // in kobo
                completedSales: totalSales,
            };
        } catch (error) {
            this.logger.warn(`Failed to calculate purchase statistics for farmer ${farmerId}:`, error);
            return {
                totalSales: 0,
                totalEarnings: 0,
                completedSales: 0,
            };
        }
    }

    /**
     * Transform farmer and user entities to detail DTO
     *
     * @param farmer - Farmer entity
     * @param user - User entity
     * @param walletBalance - Wallet balance in kobo
     * @param purchaseStats - Purchase statistics
     * @returns Farmer detail DTO
     */
    private transformToDetailDto(
        farmer: any,
        user: any,
        walletBalance: number,
        purchaseStats?: any,
    ): FarmerDetailDto {
        // Convert Mongoose documents to plain objects
        const farmerObj = farmer.toObject ? farmer.toObject() : farmer;
        const userObj = user.toObject ? user.toObject() : user;

        const combined = {
            ...farmerObj,
            phone: userObj.phone,
            phone_code: userObj.phone_code,
            status: userObj.status,
            last_login: userObj.last_login,
            last_activity: userObj.last_activity,
            wallet_balance: walletBalance,
            // Override with calculated stats if provided
            total_sales: purchaseStats?.totalSales ?? farmerObj.total_sales ?? 0,
            total_earnings: purchaseStats?.totalEarnings ?? farmerObj.total_earnings ?? 0,
            completed_sales: purchaseStats?.completedSales ?? farmerObj.completed_sales ?? 0,
        };

        return plainToInstance(FarmerDetailDto, combined, {
            excludeExtraneousValues: true,
        });
    }
}
