/**
 * BuyerService Unit Tests
 * 
 * Test Coverage:
 * - 26 comprehensive unit tests covering all service business logic
 * - Registration functionality (4 tests) 
 * - Auto-registration functionality (2 tests)
 * - Login functionality (6 tests)
 * - Change PIN functionality (6 tests)
 * - Get buyer by phone functionality (3 tests)
 * - DTO transformation functionality (2 tests)
 * - Error handling functionality (3 tests)
 * 
 * All tests validate proper business logic, error handling,
 * database interactions, and external service integrations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BuyerService } from './buyer.service';
import { BuyerRepository } from './buyer.repository';
import { SmsService } from '../../common/services/sms.service';
import { WalletService } from '../wallet/wallet.service';
import { RegisterBuyerDto, BuyerTypeEnum } from './dto/register-buyer.dto';
import { LoginBuyerDto } from './dto/login-buyer.dto';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import { DuplicatePhoneException, InvalidPinException } from '../../common/exceptions';
import * as pinUtil from '../../common/utils/pin.util';

// Mock the pin utility functions
jest.mock('../../common/utils/pin.util', () => ({
  normalizePhoneNumber: jest.fn(),
  formatPhoneForSms: jest.fn(),
  isValidPin: jest.fn(),
  comparePin: jest.fn(),
  hashPin: jest.fn(),
}));

describe('BuyerService', () => {
  let service: BuyerService;
  let buyerRepository: jest.Mocked<BuyerRepository>;
  let smsService: jest.Mocked<SmsService>;
  let walletService: jest.Mocked<WalletService>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439012',
    phone: '8012345678',
    phone_code: '234',
    password: 'hashedpin123',
    user_type: 'buyer',
    ussd_stage: 'menu',
    status: 'active',
    last_login: new Date(),
    last_activity: new Date(),
    buyer_profile_id: '507f1f77bcf86cd799439011',
  };

  const mockBuyer = {
    _id: '507f1f77bcf86cd799439011',
    user_id: '507f1f77bcf86cd799439012',
    first_name: 'Amina',
    last_name: 'Ibrahim',
    business_name: 'Amina Foods Processing Ltd',
    lga: 'Nassarawa',
    buyer_type: BuyerTypeEnum.PROCESSOR,
    total_purchases: 15,
    total_spent: 150000,
    completed_orders: 12,
    average_rating: 4.5,
    total_ratings: 8,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    toObject: jest.fn().mockReturnValue({
      _id: '507f1f77bcf86cd799439011',
      user_id: '507f1f77bcf86cd799439012',
      first_name: 'Amina',
      last_name: 'Ibrahim',
      business_name: 'Amina Foods Processing Ltd',
      lga: 'Nassarawa',
      buyer_type: BuyerTypeEnum.PROCESSOR,
    }),
  };

  const mockBuyerRepository = {
    findUserByPhone: jest.fn(),
    findBuyerByUserId: jest.fn(),
    createBuyer: jest.fn(),
    updateUser: jest.fn(),
    updateBuyer: jest.fn(),
  };

  const mockSmsService = {
    sendBuyerWelcomeSms: jest.fn(),
    sendPinChangeSms: jest.fn(),
  };

  const mockWalletService = {
    createWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerService,
        {
          provide: BuyerRepository,
          useValue: mockBuyerRepository,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<BuyerService>(BuyerService);
    buyerRepository = module.get<BuyerRepository>(BuyerRepository) as jest.Mocked<BuyerRepository>;
    smsService = module.get<SmsService>(SmsService) as jest.Mocked<SmsService>;
    walletService = module.get<WalletService>(WalletService) as jest.Mocked<WalletService>;

    // Setup default mock implementations
    (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({ phone: '8012345678' });
    (pinUtil.formatPhoneForSms as jest.Mock).mockReturnValue('+2348012345678');
    (pinUtil.isValidPin as jest.Mock).mockReturnValue(true);
    (pinUtil.comparePin as jest.Mock).mockResolvedValue(true);
    (pinUtil.hashPin as jest.Mock).mockResolvedValue('hashedpin123');
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to defaults
    (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({ phone: '8012345678' });
    (pinUtil.formatPhoneForSms as jest.Mock).mockReturnValue('+2348012345678');
    (pinUtil.isValidPin as jest.Mock).mockReturnValue(true);
    (pinUtil.comparePin as jest.Mock).mockResolvedValue(true);
    (pinUtil.hashPin as jest.Mock).mockResolvedValue('hashedpin123');
  });

  describe('register', () => {
    const registerDto: RegisterBuyerDto = {
      phone: '8012345678',
      pin: '1234',
      firstName: 'Amina',
      lastName: 'Ibrahim',
      businessName: 'Amina Foods Processing Ltd',
      state: 'Kano',
      lga: 'Nassarawa',
      buyerType: BuyerTypeEnum.PROCESSOR,
    };

    it('should register a new buyer successfully', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockResolvedValue({
        user: { ...mockUser, toObject: () => mockUser } as any,
        buyer: mockBuyer as any,
      });
      walletService.createWallet.mockResolvedValue(undefined);
      smsService.sendBuyerWelcomeSms.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(pinUtil.isValidPin).toHaveBeenCalledWith('1234');
      expect(buyerRepository.createBuyer).toHaveBeenCalledWith({
        ...registerDto,
        phone: '8012345678',
      });
      expect(walletService.createWallet).toHaveBeenCalledWith(mockUser._id, 'buyer');
      expect(smsService.sendBuyerWelcomeSms).toHaveBeenCalledWith('Amina', '+2348012345678');
      expect(result).toHaveProperty('firstName', 'Amina');
      expect(result).toHaveProperty('phone', '8012345678');
    });

    it('should throw DuplicatePhoneException when phone already exists', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(DuplicatePhoneException);
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid PIN', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      (pinUtil.isValidPin as jest.Mock).mockReturnValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(pinUtil.isValidPin).toHaveBeenCalledWith('1234');
      expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
    });

    it('should handle different buyer types', async () => {
      const aggregatorDto = { ...registerDto, buyerType: BuyerTypeEnum.AGGREGATOR };
      const aggregatorBuyer = { ...mockBuyer, buyer_type: BuyerTypeEnum.AGGREGATOR };

      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockResolvedValue({
        user: { ...mockUser, toObject: () => mockUser } as any,
        buyer: { ...aggregatorBuyer, toObject: () => aggregatorBuyer } as any,
      });
      walletService.createWallet.mockResolvedValue(undefined);
      smsService.sendBuyerWelcomeSms.mockResolvedValue(undefined);

      const result = await service.register(aggregatorDto);

      expect(result).toHaveProperty('buyerType', BuyerTypeEnum.AGGREGATOR);
    });
  });

  describe('autoRegister', () => {
    it('should auto-register a buyer with placeholder data', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockResolvedValue({
        user: { ...mockUser, toObject: () => mockUser } as any,
        buyer: mockBuyer as any,
      });
      walletService.createWallet.mockResolvedValue(undefined);
      smsService.sendBuyerWelcomeSms.mockResolvedValue(undefined);

      const result = await service.autoRegister('8012345678', '1234');

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(result).toHaveProperty('phone', '8012345678');
    });

    it('should throw DuplicatePhoneException for existing phone in auto-register', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);

      await expect(service.autoRegister('8012345678', '1234')).rejects.toThrow(DuplicatePhoneException);
    });
  });

  describe('login', () => {
    const loginDto: LoginBuyerDto = {
      phone: '8012345678',
      pin: '1234',
    };

    it('should login buyer successfully', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.updateUser.mockResolvedValue(undefined);
      buyerRepository.findBuyerByUserId.mockResolvedValue(mockBuyer as any);

      const result = await service.login(loginDto);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(pinUtil.comparePin).toHaveBeenCalledWith('1234', 'hashedpin123');
      expect(buyerRepository.updateUser).toHaveBeenCalledWith(
        mockUser._id.toString(),
        expect.objectContaining({
          last_login: expect.any(Date),
          last_activity: expect.any(Date),
        }),
      );
      expect(result).toHaveProperty('firstName', 'Amina');
    });

    it('should throw InvalidPinException when user not found', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidPinException);
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
    });

    it('should throw InvalidPinException when user is not a buyer', async () => {
      const farmerUser = { ...mockUser, user_type: 'farmer' };
      buyerRepository.findUserByPhone.mockResolvedValue(farmerUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidPinException);
    });

    it('should throw BadRequestException when account is suspended', async () => {
      const suspendedUser = { ...mockUser, status: 'suspended' };
      buyerRepository.findUserByPhone.mockResolvedValue(suspendedUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InvalidPinException for incorrect PIN', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      (pinUtil.comparePin as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidPinException);
      expect(pinUtil.comparePin).toHaveBeenCalledWith('1234', 'hashedpin123');
    });

    it('should throw NotFoundException when buyer profile not found', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.updateUser.mockResolvedValue(undefined);
      buyerRepository.findBuyerByUserId.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePin', () => {
    const phone = '8012345678';
    const changePinDto: ChangePinDto = {
      currentPin: '1234',
      newPin: '5678',
    };

    it('should change PIN successfully', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.updateUser.mockResolvedValue(undefined);
      buyerRepository.findBuyerByUserId.mockResolvedValue(mockBuyer as any);
      smsService.sendPinChangeSms.mockResolvedValue(undefined);

      const result = await service.changePin(phone, changePinDto);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(pinUtil.comparePin).toHaveBeenCalledWith('1234', 'hashedpin123');
      expect(pinUtil.isValidPin).toHaveBeenCalledWith('5678');
      expect(pinUtil.hashPin).toHaveBeenCalledWith('5678');
      expect(buyerRepository.updateUser).toHaveBeenCalledWith(
        mockUser._id.toString(),
        { password: 'hashedpin123' },
      );
      expect(smsService.sendPinChangeSms).toHaveBeenCalledWith('Amina', '+2348012345678');
      expect(result).toHaveProperty('firstName', 'Amina');
    });

    it('should throw NotFoundException when buyer not found', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);

      await expect(service.changePin(phone, changePinDto)).rejects.toThrow(NotFoundException);
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
    });

    it('should throw BadRequestException for incorrect current PIN', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      (pinUtil.comparePin as jest.Mock).mockResolvedValue(false);

      await expect(service.changePin(phone, changePinDto)).rejects.toThrow(BadRequestException);
      expect(pinUtil.comparePin).toHaveBeenCalledWith('1234', 'hashedpin123');
    });

    it('should throw BadRequestException for invalid new PIN', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      // Reset the mock and set it up for this specific test
      (pinUtil.comparePin as jest.Mock).mockResolvedValue(true); // current pin is correct
      (pinUtil.isValidPin as jest.Mock).mockReturnValue(false); // new pin is invalid

      await expect(service.changePin(phone, changePinDto)).rejects.toThrow(BadRequestException);
      expect(pinUtil.isValidPin).toHaveBeenCalledWith('5678');
      expect(buyerRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new PIN is same as current PIN', async () => {
      const samePinDto = { currentPin: '1234', newPin: '1234' };
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);

      await expect(service.changePin(phone, samePinDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when buyer profile not found after PIN update', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.updateUser.mockResolvedValue(undefined);
      buyerRepository.findBuyerByUserId.mockResolvedValue(undefined);

      await expect(service.changePin(phone, changePinDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBuyerByPhone', () => {
    const phone = '8012345678';

    it('should get buyer by phone successfully', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.findBuyerByUserId.mockResolvedValue(mockBuyer as any);

      const result = await service.getBuyerByPhone(phone);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith(phone);
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(buyerRepository.findBuyerByUserId).toHaveBeenCalledWith(mockUser._id.toString());
      expect(result).toHaveProperty('firstName', 'Amina');
      expect(result).toHaveProperty('phone', '8012345678');
    });

    it('should throw NotFoundException when user not found', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);

      await expect(service.getBuyerByPhone(phone)).rejects.toThrow(NotFoundException);
      expect(buyerRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
    });

    it('should throw NotFoundException when buyer profile not found', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(mockUser as any);
      buyerRepository.findBuyerByUserId.mockResolvedValue(undefined);

      await expect(service.getBuyerByPhone(phone)).rejects.toThrow(NotFoundException);
      expect(buyerRepository.findBuyerByUserId).toHaveBeenCalledWith(mockUser._id.toString());
    });
  });

  describe('transformToResponseDto', () => {
    it('should transform buyer and user entities to response DTO', async () => {
      const mockUserWithToObject = {
        ...mockUser,
        toObject: jest.fn().mockReturnValue(mockUser),
      };

      buyerRepository.findUserByPhone.mockResolvedValue(mockUserWithToObject as any);
      buyerRepository.findBuyerByUserId.mockResolvedValue(mockBuyer as any);

      const result = await service.getBuyerByPhone('8012345678');

      expect(mockBuyer.toObject).toHaveBeenCalled();
      expect(result).toHaveProperty('firstName', 'Amina');
      expect(result).toHaveProperty('phone', '8012345678');
    });

    it('should handle entities without toObject method', async () => {
      const plainUser = { ...mockUser };
      const plainBuyer = { ...mockBuyer, toObject: undefined };

      buyerRepository.findUserByPhone.mockResolvedValue(plainUser as any);
      buyerRepository.findBuyerByUserId.mockResolvedValue(plainBuyer as any);

      const result = await service.getBuyerByPhone('8012345678');

      expect(result).toHaveProperty('firstName', 'Amina');
      expect(result).toHaveProperty('phone', '8012345678');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors during registration', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockRejectedValue(new Error('Database error'));

      const registerDto: RegisterBuyerDto = {
        phone: '8012345678',
        pin: '1234',
        firstName: 'Amina',
        lastName: 'Ibrahim',
        businessName: 'Amina Foods Processing Ltd',
        state: 'Kano',
        lga: 'Nassarawa',
        buyerType: BuyerTypeEnum.PROCESSOR,
      };

      await expect(service.register(registerDto)).rejects.toThrow('Database error');
    });

    it('should handle SMS service errors during registration', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockResolvedValue({
        user: { ...mockUser, toObject: () => mockUser } as any,
        buyer: mockBuyer as any,
      });
      walletService.createWallet.mockResolvedValue(undefined);
      smsService.sendBuyerWelcomeSms.mockRejectedValue(new Error('SMS error'));

      const registerDto: RegisterBuyerDto = {
        phone: '8012345678',
        pin: '1234',
        firstName: 'Amina',
        lastName: 'Ibrahim',
        businessName: 'Amina Foods Processing Ltd',
        state: 'Kano',
        lga: 'Nassarawa',
        buyerType: BuyerTypeEnum.PROCESSOR,
      };

      await expect(service.register(registerDto)).rejects.toThrow('SMS error');
    });

    it('should handle wallet service errors during registration', async () => {
      buyerRepository.findUserByPhone.mockResolvedValue(undefined);
      buyerRepository.createBuyer.mockResolvedValue({
        user: { ...mockUser, toObject: () => mockUser } as any,
        buyer: mockBuyer as any,
      });
      walletService.createWallet.mockRejectedValue(new Error('Wallet error'));

      const registerDto: RegisterBuyerDto = {
        phone: '8012345678',
        pin: '1234',
        firstName: 'Amina',
        lastName: 'Ibrahim',
        businessName: 'Amina Foods Processing Ltd',
        state: 'Kano',
        lga: 'Nassarawa',
        buyerType: BuyerTypeEnum.PROCESSOR,
      };

      await expect(service.register(registerDto)).rejects.toThrow('Wallet error');
    });
  });
});