import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { BuyerRepository } from './buyer.repository';
import { RegisterBuyerDto } from './dto/register-buyer.dto';
import { LoginBuyerDto } from './dto/login-buyer.dto';
import { BuyerResponseDto } from './dto/buyer-response.dto';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import { plainToInstance } from 'class-transformer';
import { DuplicatePhoneException, InvalidPinException } from '../../common/exceptions';
import { comparePin, isValidPin, normalizePhoneNumber, formatPhoneForSms, hashPin } from '../../common/utils/pin.util';
import { SmsService } from '../../common/services/sms.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class BuyerService {
    private readonly logger = new Logger(BuyerService.name);

    constructor(
        private readonly buyerRepository: BuyerRepository,
        private readonly smsService: SmsService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * Auto-register buyer using DOJAH NIMC verification
     * TODO: Integrate with DOJAH API
     *
     * @param phone - Phone number
     * @param pin - 4-digit PIN
     * @returns Buyer response
     */
    async autoRegister(phone: string, pin: string): Promise<BuyerResponseDto> {
        this.logger.log(`Auto-registering buyer with NIMC verification: ${phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);

        // Check if phone already exists
        const existingUser = await this.buyerRepository.findUserByPhone(normalizedPhone);
        if (existingUser) {
            throw new DuplicatePhoneException(normalizedPhone);
        }

        // TODO: Integrate with DOJAH API for NIMC verification
        // For now, use placeholder data
        const registerDto: RegisterBuyerDto = {
            phone: normalizedPhone,
            pin,
            firstName: 'Auto',
            lastName: 'Buyer',
            businessName: 'Auto Business',
            state: 'Lagos',
            lga: 'Ikeja',
            buyerType: 'processor' as any,
        };

        return this.register(registerDto);
    }

    /**
     * Register a new buyer
     *
     * @param registerBuyerDto - Buyer registration data
     * @returns Buyer response
     * @throws DuplicatePhoneException if phone exists
     * @throws BadRequestException if PIN is invalid
     */
    async register(registerBuyerDto: RegisterBuyerDto): Promise<BuyerResponseDto> {
        this.logger.log(`Registering buyer: ${registerBuyerDto.phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(registerBuyerDto.phone);
        registerBuyerDto.phone = normalizedPhone;

        // Check if phone already exists
        const existingUser = await this.buyerRepository.findUserByPhone(normalizedPhone);
        if (existingUser) {
            throw new DuplicatePhoneException(normalizedPhone);
        }

        // Validate PIN
        if (!isValidPin(registerBuyerDto.pin)) {
            throw new BadRequestException('PIN must be exactly 4 digits');
        }

        // Create buyer (password will be hashed by pre-save hook)
        const { user, buyer } = await this.buyerRepository.createBuyer(registerBuyerDto);

        this.logger.log(`Buyer registered successfully: ${user.phone}`);

        // Create wallet for buyer
        await this.walletService.createWallet(user._id, 'buyer');
        this.logger.log(`Wallet created for buyer: ${String(user._id)}`);

        // Send welcome SMS
        const phoneForSms = formatPhoneForSms(user.phone, user.phone_code);
        await this.smsService.sendBuyerWelcomeSms(registerBuyerDto.firstName, phoneForSms);

        return this.transformToResponseDto(buyer, user);
    }

    /**
     * Buyer login
     *
     * @param loginBuyerDto - Login credentials
     * @returns Buyer response
     * @throws InvalidPinException if credentials are invalid
     */
    async login(loginBuyerDto: LoginBuyerDto): Promise<BuyerResponseDto> {
        this.logger.log(`Buyer login attempt: ${loginBuyerDto.phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(loginBuyerDto.phone);

        // Find user
        const user = await this.buyerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            throw new InvalidPinException();
        }

        // Check if user is a buyer
        if (user.user_type !== 'buyer') {
            throw new InvalidPinException();
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new BadRequestException('Account is suspended or banned');
        }

        // Verify PIN
        const isPinValid = await comparePin(loginBuyerDto.pin, user.password);
        if (!isPinValid) {
            throw new InvalidPinException();
        }

        // Update last login
        await this.buyerRepository.updateUser(user._id.toString(), {
            last_login: new Date(),
            last_activity: new Date(),
        } as any);

        // Get buyer profile
        const buyer = await this.buyerRepository.findBuyerByUserId(user._id.toString());
        if (!buyer) {
            throw new NotFoundException('Buyer profile not found');
        }

        this.logger.log(`Buyer logged in successfully: ${user.phone}`);

        return this.transformToResponseDto(buyer, user);
    }

    /**
     * Change buyer PIN
     *
     * @param phone - Phone number
     * @param changePinDto - PIN change data
     * @returns Buyer response
     * @throws NotFoundException if buyer not found
     * @throws BadRequestException if current PIN is incorrect or new PIN is invalid
     */
    async changePin(phone: string, changePinDto: ChangePinDto): Promise<BuyerResponseDto> {
        this.logger.log(`Changing PIN for buyer: ${phone}`);

        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);

        // Find user
        const user = await this.buyerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            throw new NotFoundException(`Buyer with phone ${normalizedPhone} not found`);
        }

        // Verify current PIN
        const isCurrentPinValid = await comparePin(changePinDto.currentPin, user.password);
        if (!isCurrentPinValid) {
            throw new BadRequestException('Current PIN is incorrect');
        }

        // Validate new PIN
        if (!isValidPin(changePinDto.newPin)) {
            throw new BadRequestException('New PIN must be exactly 4 digits');
        }

        // Check if new PIN is same as current PIN
        if (changePinDto.newPin === changePinDto.currentPin) {
            throw new BadRequestException('New PIN must be different from current PIN');
        }

        // Update PIN
        const hashedPin = await hashPin(changePinDto.newPin);
        await this.buyerRepository.updateUser(user._id.toString(), {
            password: hashedPin,
        } as any);

        // Get buyer profile
        const buyer = await this.buyerRepository.findBuyerByUserId(user._id.toString());
        if (!buyer) {
            throw new NotFoundException('Buyer profile not found');
        }

        this.logger.log(`PIN changed successfully for buyer: ${phone}`);

        // Send confirmation SMS
        const phoneForSms = formatPhoneForSms(user.phone, user.phone_code);
        await this.smsService.sendPinChangeSms(buyer.first_name, phoneForSms);

        return this.transformToResponseDto(buyer, user);
    }

    /**
     * Get buyer by phone number
     *
     * @param phone - Phone number
     * @returns Buyer response
     * @throws NotFoundException if buyer not found
     */
    async getBuyerByPhone(phone: string): Promise<BuyerResponseDto> {
        // Normalize phone number
        const { phone: normalizedPhone } = normalizePhoneNumber(phone);

        const user = await this.buyerRepository.findUserByPhone(normalizedPhone);
        if (!user) {
            throw new NotFoundException(`Buyer with phone ${normalizedPhone} not found`);
        }

        const buyer = await this.buyerRepository.findBuyerByUserId(user._id.toString());
        if (!buyer) {
            throw new NotFoundException('Buyer profile not found');
        }

        return this.transformToResponseDto(buyer, user);
    }

    /**
     * Transform buyer and user entities to response DTO
     *
     * @param buyer - Buyer entity
     * @param user - User entity
     * @returns Buyer response DTO
     */
    private transformToResponseDto(buyer: any, user: any): BuyerResponseDto {
        // Convert Mongoose documents to plain objects
        const buyerObj = buyer.toObject ? buyer.toObject() : buyer;
        const userObj = user.toObject ? user.toObject() : user;

        const combined = {
            ...buyerObj,
            phone: userObj.phone,
            phone_code: userObj.phone_code,
        };

        return plainToInstance(BuyerResponseDto, combined, {
            excludeExtraneousValues: true,
        });
    }
}
