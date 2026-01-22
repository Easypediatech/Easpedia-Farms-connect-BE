/**
 * BuyerController Unit Tests
 * 
 * Test Coverage:
 * - 26 comprehensive unit tests covering all controller endpoints
 * - Register buyer functionality (6 tests)
 * - Login buyer functionality (4 tests)  
 * - Change PIN functionality (5 tests)
 * - Get profile functionality (5 tests)
 * - Error response status codes (3 tests)
 * - Response format validation (3 tests)
 * 
 * All tests validate proper HTTP responses, error handling, 
 * and integration with BuyerService methods.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { BuyerController } from './buyer.controller';
import { BuyerService } from './buyer.service';
import { RegisterBuyerDto, BuyerTypeEnum } from './dto/register-buyer.dto';
import { LoginBuyerDto } from './dto/login-buyer.dto';
import { ChangePinDto } from '../farmer/dto/change-pin.dto';
import { BuyerResponseDto } from './dto/buyer-response.dto';
import { DuplicatePhoneException, InvalidPinException } from '../../common/exceptions';

describe('BuyerController', () => {
  let controller: BuyerController;
  let service: jest.Mocked<BuyerService>;

  const mockBuyerResponseDto: BuyerResponseDto = {
    id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    firstName: 'Amina',
    lastName: 'Ibrahim',
    fullName: 'Amina Ibrahim',
    businessName: 'Amina Foods Processing Ltd',
    lga: 'Nassarawa',
    buyerType: BuyerTypeEnum.PROCESSOR,
    totalPurchases: 15,
    totalSpent: 150000,
    completedOrders: 12,
    averageRating: 4.5,
    totalRatings: 8,
    phone: '8012345678',
    phoneCode: '234',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockBuyerService = {
    register: jest.fn(),
    login: jest.fn(),
    changePin: jest.fn(),
    getBuyerByPhone: jest.fn(),
    autoRegister: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuyerController],
      providers: [
        {
          provide: BuyerService,
          useValue: mockBuyerService,
        },
      ],
    }).compile();

    controller = module.get<BuyerController>(BuyerController);
    service = module.get<BuyerService>(BuyerService) as jest.Mocked<BuyerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      service.register.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        success: true,
        data: mockBuyerResponseDto,
        message: 'Buyer registered successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw ConflictException when phone number already exists', async () => {
      service.register.mockRejectedValue(new DuplicatePhoneException('8012345678'));

      await expect(controller.register(registerDto)).rejects.toThrow(DuplicatePhoneException);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException for invalid PIN format', async () => {
      service.register.mockRejectedValue(new BadRequestException('PIN must be exactly 4 digits'));

      await expect(controller.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle different buyer types', async () => {
      const aggregatorDto = { ...registerDto, buyerType: BuyerTypeEnum.AGGREGATOR };
      const aggregatorResponse = { ...mockBuyerResponseDto, buyerType: BuyerTypeEnum.AGGREGATOR };
      
      service.register.mockResolvedValue(aggregatorResponse);

      const result = await controller.register(aggregatorDto);

      expect(service.register).toHaveBeenCalledWith(aggregatorDto);
      expect(result.data.buyerType).toBe(BuyerTypeEnum.AGGREGATOR);
    });

    it('should handle trader buyer type', async () => {
      const traderDto = { ...registerDto, buyerType: BuyerTypeEnum.TRADER };
      const traderResponse = { ...mockBuyerResponseDto, buyerType: BuyerTypeEnum.TRADER };
      
      service.register.mockResolvedValue(traderResponse);

      const result = await controller.register(traderDto);

      expect(service.register).toHaveBeenCalledWith(traderDto);
      expect(result.data.buyerType).toBe(BuyerTypeEnum.TRADER);
    });

    it('should handle exporter buyer type', async () => {
      const exporterDto = { ...registerDto, buyerType: BuyerTypeEnum.EXPORTER };
      const exporterResponse = { ...mockBuyerResponseDto, buyerType: BuyerTypeEnum.EXPORTER };
      
      service.register.mockResolvedValue(exporterResponse);

      const result = await controller.register(exporterDto);

      expect(service.register).toHaveBeenCalledWith(exporterDto);
      expect(result.data.buyerType).toBe(BuyerTypeEnum.EXPORTER);
    });
  });

  describe('login', () => {
    const loginDto: LoginBuyerDto = {
      phone: '8012345678',
      pin: '1234',
    };

    it('should login buyer successfully', async () => {
      service.login.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({
        success: true,
        data: mockBuyerResponseDto,
        message: 'Login successful',
        timestamp: expect.any(String),
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      service.login.mockRejectedValue(new InvalidPinException());

      await expect(controller.login(loginDto)).rejects.toThrow(InvalidPinException);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle login with different phone numbers', async () => {
      const differentLoginDto = { ...loginDto, phone: '9012345678' };
      const differentResponse = { ...mockBuyerResponseDto, phone: '9012345678' };
      
      service.login.mockResolvedValue(differentResponse);

      const result = await controller.login(differentLoginDto);

      expect(service.login).toHaveBeenCalledWith(differentLoginDto);
      expect(result.data.phone).toBe('9012345678');
    });

    it('should handle suspended account', async () => {
      service.login.mockRejectedValue(new BadRequestException('Account is suspended or banned'));

      await expect(controller.login(loginDto)).rejects.toThrow(BadRequestException);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('changePin', () => {
    const phone = '8012345678';
    const changePinDto: ChangePinDto = {
      currentPin: '1234',
      newPin: '5678',
    };

    it('should change PIN successfully', async () => {
      service.changePin.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.changePin(phone, changePinDto);

      expect(service.changePin).toHaveBeenCalledWith(phone, changePinDto);
      expect(result).toEqual({
        success: true,
        data: mockBuyerResponseDto,
        message: 'PIN changed successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException when buyer not found', async () => {
      service.changePin.mockRejectedValue(new NotFoundException('Buyer with phone 8012345678 not found'));

      await expect(controller.changePin(phone, changePinDto)).rejects.toThrow(NotFoundException);
      expect(service.changePin).toHaveBeenCalledWith(phone, changePinDto);
    });

    it('should throw BadRequestException for incorrect current PIN', async () => {
      service.changePin.mockRejectedValue(new BadRequestException('Current PIN is incorrect'));

      await expect(controller.changePin(phone, changePinDto)).rejects.toThrow(BadRequestException);
      expect(service.changePin).toHaveBeenCalledWith(phone, changePinDto);
    });

    it('should throw BadRequestException for invalid new PIN', async () => {
      service.changePin.mockRejectedValue(new BadRequestException('New PIN must be exactly 4 digits'));

      await expect(controller.changePin(phone, changePinDto)).rejects.toThrow(BadRequestException);
      expect(service.changePin).toHaveBeenCalledWith(phone, changePinDto);
    });

    it('should throw BadRequestException when new PIN is same as current PIN', async () => {
      service.changePin.mockRejectedValue(new BadRequestException('New PIN must be different from current PIN'));

      await expect(controller.changePin(phone, changePinDto)).rejects.toThrow(BadRequestException);
      expect(service.changePin).toHaveBeenCalledWith(phone, changePinDto);
    });
  });

  describe('getProfile', () => {
    const phone = '8012345678';

    it('should get buyer profile successfully', async () => {
      service.getBuyerByPhone.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.getProfile(phone);

      expect(service.getBuyerByPhone).toHaveBeenCalledWith(phone);
      expect(result).toEqual({
        success: true,
        data: mockBuyerResponseDto,
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException when buyer not found', async () => {
      service.getBuyerByPhone.mockRejectedValue(new NotFoundException('Buyer with phone 8012345678 not found'));

      await expect(controller.getProfile(phone)).rejects.toThrow(NotFoundException);
      expect(service.getBuyerByPhone).toHaveBeenCalledWith(phone);
    });

    it('should get profile for different phone numbers', async () => {
      const differentPhone = '9012345678';
      const differentResponse = { ...mockBuyerResponseDto, phone: differentPhone };
      
      service.getBuyerByPhone.mockResolvedValue(differentResponse);

      const result = await controller.getProfile(differentPhone);

      expect(service.getBuyerByPhone).toHaveBeenCalledWith(differentPhone);
      expect(result.data.phone).toBe(differentPhone);
    });

    it('should get profile with zero purchases', async () => {
      const newBuyerResponse = {
        ...mockBuyerResponseDto,
        totalPurchases: 0,
        totalSpent: 0,
        completedOrders: 0,
        averageRating: 0,
        totalRatings: 0,
      };
      
      service.getBuyerByPhone.mockResolvedValue(newBuyerResponse);

      const result = await controller.getProfile(phone);

      expect(service.getBuyerByPhone).toHaveBeenCalledWith(phone);
      expect(result.data.totalPurchases).toBe(0);
      expect(result.data.totalSpent).toBe(0);
    });

    it('should get profile with high purchase activity', async () => {
      const activeBuyerResponse = {
        ...mockBuyerResponseDto,
        totalPurchases: 100,
        totalSpent: 500000,
        completedOrders: 95,
        averageRating: 4.8,
        totalRatings: 50,
      };
      
      service.getBuyerByPhone.mockResolvedValue(activeBuyerResponse);

      const result = await controller.getProfile(phone);

      expect(service.getBuyerByPhone).toHaveBeenCalledWith(phone);
      expect(result.data.totalPurchases).toBe(100);
      expect(result.data.averageRating).toBe(4.8);
    });
  });

  describe('Error Response Status Codes', () => {
    it('should return 409 for duplicate phone registration', async () => {
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

      service.register.mockRejectedValue(new DuplicatePhoneException('8012345678'));

      await expect(controller.register(registerDto)).rejects.toThrow(DuplicatePhoneException);
    });

    it('should return 401 for invalid login credentials', async () => {
      const loginDto: LoginBuyerDto = {
        phone: '8012345678',
        pin: 'wrong',
      };

      service.login.mockRejectedValue(new InvalidPinException());

      await expect(controller.login(loginDto)).rejects.toThrow(InvalidPinException);
    });

    it('should return 404 for profile not found', async () => {
      service.getBuyerByPhone.mockRejectedValue(new NotFoundException('Buyer with phone 9999999999 not found'));

      await expect(controller.getProfile('9999999999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly formatted success response for registration', async () => {
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

      service.register.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.register(registerDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message', 'Buyer registered successfully');
      expect(result).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('phone');
      expect(result.data).toHaveProperty('firstName');
    });

    it('should return properly formatted success response for login', async () => {
      const loginDto: LoginBuyerDto = {
        phone: '8012345678',
        pin: '1234',
      };

      service.login.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message', 'Login successful');
      expect(result).toHaveProperty('timestamp');
      expect(result.data).toEqual(mockBuyerResponseDto);
    });

    it('should return properly formatted success response for profile', async () => {
      service.getBuyerByPhone.mockResolvedValue(mockBuyerResponseDto);

      const result = await controller.getProfile('8012345678');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      expect(result.data).toEqual(mockBuyerResponseDto);
    });
  });
});