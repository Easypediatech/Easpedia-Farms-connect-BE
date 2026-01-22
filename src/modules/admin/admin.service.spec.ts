import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { ProductRepository } from './product.repository';
import { LoanRepository } from '../loan/loan.repository';
import { CreateAdminDto, AdminRole } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetAllFarmersDto } from './dto/get-all-farmers.dto';
import { GetAllBuyersDto } from './dto/get-all-buyers.dto';
import {
  DuplicateUsernameException,
  DuplicateEmailException,
  InvalidCredentialsException,
} from '../../common/exceptions';
import * as passwordUtil from '../../common/utils/password.util';
import { User } from '../../schemas/user.schema';
import { Farmer } from '../../schemas/farmer.schema';
import { Buyer } from '../../schemas/buyer.schema';
import { Transaction } from '../../schemas/transaction.schema';
import { Order } from '../../schemas/order.schema';
import { Purchase } from '../../schemas/purchase.schema';
import { UssdSession } from '../../schemas/ussd-session.schema';
import { Loan } from '../../schemas/loan.schema';
import { LoanType } from '../../schemas/loan-type.schema';
import { Settings } from '../../schemas/settings.schema';
import { SmsService } from '../../common/services/sms.service';
import { StaffRepository } from '../staff/staff.repository';
import { StaffService } from '../staff/staff.service';

describe('AdminService', () => {
  let service: AdminService;
  let repository: jest.Mocked<AdminRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let smsService: jest.Mocked<SmsService>;
  let userModel: any;
  let farmerModel: any;
  let buyerModel: any;
  let transactionModel: any;
  let orderModel: any;
  let purchaseModel: any;
  let ussdSessionModel: any;
  let loanModel: any;
  let loanTypeModel: any;
  let settingsModel: any;

  const mockAdmin = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    email: 'test@farmconnect.com',
    password: 'hashedPassword123',
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    role: AdminRole.SUPPORT,
    permissions: ['manage_users'],
    is_active: true,
    last_login: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findAllWithQuery: jest.fn(),
    countWithQuery: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockSmsService = {
    sendSms: jest.fn(),
  };

  const mockProductRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockLoanRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByStatus: jest.fn(),
    countByStatus: jest.fn(),
    findLoanRequests: jest.fn(),
    getFarmerLoanCount: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    findById: jest.fn().mockReturnValue({
      save: jest.fn(),
    }),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    exec: jest.fn(),
  };

  const mockFarmerModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    findById: jest.fn().mockReturnValue({
      save: jest.fn(),
      populate: jest.fn(),
    }),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockBuyerModel = {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockTransactionModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const mockOrderModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const mockPurchaseModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const mockUssdSessionModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    distinct: jest.fn(),
  };

  const mockLoanModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
    find: jest.fn(),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn(),
      save: jest.fn(),
    }),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    exec: jest.fn(),
  };

  const mockLoanTypeModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockSettingsModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockStaffRepository = {
    findStaffById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AdminRepository,
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        {
          provide: LoanRepository,
          useValue: mockLoanRepository,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Farmer.name),
          useValue: mockFarmerModel,
        },
        {
          provide: getModelToken(Buyer.name),
          useValue: mockBuyerModel,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(Purchase.name),
          useValue: mockPurchaseModel,
        },
        {
          provide: getModelToken(UssdSession.name),
          useValue: mockUssdSessionModel,
        },
        {
          provide: getModelToken(Loan.name),
          useValue: mockLoanModel,
        },
        {
          provide: getModelToken(LoanType.name),
          useValue: mockLoanTypeModel,
        },
        {
          provide: getModelToken(Settings.name),
          useValue: mockSettingsModel,
        },
        {
          provide: StaffRepository,
          useValue: mockStaffRepository,
        },
        {
          provide: StaffService,
          useValue: {
            getProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    repository = module.get(AdminRepository);
    jwtService = module.get(JwtService);
    smsService = module.get(SmsService);
    userModel = module.get(getModelToken(User.name));
    farmerModel = module.get(getModelToken(Farmer.name));
    buyerModel = module.get(getModelToken(Buyer.name));
    transactionModel = module.get(getModelToken(Transaction.name));
    orderModel = module.get(getModelToken(Order.name));
    purchaseModel = module.get(getModelToken(Purchase.name));
    ussdSessionModel = module.get(getModelToken(UssdSession.name));
    loanModel = module.get(getModelToken(Loan.name));
    loanTypeModel = module.get(getModelToken(LoanType.name));
    settingsModel = module.get(getModelToken(Settings.name));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createAdminDto: CreateAdminDto = {
      email: 'new@farmconnect.com',
      password: 'Password123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: AdminRole.SUPPORT,
      permissions: ['view_reports'],
    };

    it('should create a new admin successfully', async () => {
      repository.findByEmail.mockResolvedValue(undefined);
      jest.spyOn(passwordUtil, 'isStrongPassword').mockReturnValue(true);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashedPass');
      repository.create.mockResolvedValue({ ...mockAdmin, ...createAdminDto });

      const result = await service.create(createAdminDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(
        'new@farmconnect.com',
      );
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('Password123');
      expect(repository.create).toHaveBeenCalled();
      expect(result.email).toBe('new@farmconnect.com');
    });

    it('should throw DuplicateEmailException if email exists', async () => {
      repository.findByEmail.mockResolvedValue(mockAdmin as any);

      await expect(service.create(createAdminDto)).rejects.toThrow(
        DuplicateEmailException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if password is weak', async () => {
      repository.findByEmail.mockResolvedValue(undefined);
      jest.spyOn(passwordUtil, 'isStrongPassword').mockReturnValue(false);

      await expect(service.create(createAdminDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return admin by ID', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(repository.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException if admin not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all active admins', async () => {
      repository.findAll.mockResolvedValue([mockAdmin, mockAdmin] as any);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAdminDto = {
      firstName: 'Updated',
      email: 'updated@farmconnect.com',
    };

    it('should update admin successfully', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      repository.findByEmail.mockResolvedValue(undefined);
      repository.update.mockResolvedValue({
        ...mockAdmin,
        first_name: 'Updated',
        email: 'updated@farmconnect.com',
      } as any);

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(repository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException if admin not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw DuplicateEmailException if email exists', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      repository.findByEmail.mockResolvedValue({
        ...mockAdmin,
        id: 'different',
      } as any);

      await expect(
        service.update('507f1f77bcf86cd799439011', {
          email: 'taken@email.com',
        }),
      ).rejects.toThrow(DuplicateEmailException);
    });
  });

  describe('delete', () => {
    it('should soft delete admin', async () => {
      repository.delete.mockResolvedValue({
        ...mockAdmin,
        is_active: false,
      } as any);

      const result = await service.delete('507f1f77bcf86cd799439011');

      expect(repository.delete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if admin not found', async () => {
      repository.delete.mockResolvedValue(undefined);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginAdminDto = {
      email: 'test@farmconnect.com',
      password: 'Password123',
    };

    it('should login admin successfully', async () => {
      repository.findByEmail.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(
        'test@farmconnect.com',
      );
      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(
        'Password123',
        'hashedPassword123',
      );
      expect(result.email).toBe('test@farmconnect.com');
    });

    it('should throw InvalidCredentialsException if admin not found', async () => {
      repository.findByEmail.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException if password invalid', async () => {
      repository.findByEmail.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException if admin is inactive', async () => {
      repository.findByEmail.mockResolvedValue({
        ...mockAdmin,
        is_active: false,
      } as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
    };

    it('should change password successfully', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(passwordUtil, 'isStrongPassword').mockReturnValue(true);
      jest
        .spyOn(passwordUtil, 'hashPassword')
        .mockResolvedValue('newHashedPass');
      repository.update.mockResolvedValue(mockAdmin as any);

      const result = await service.changePassword(
        '507f1f77bcf86cd799439011',
        changePasswordDto,
      );

      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(
        'OldPassword123',
        'hashedPassword123',
      );
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('NewPassword123');
      expect(repository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if admin not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.changePassword('nonexistent', changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password incorrect', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.changePassword('507f1f77bcf86cd799439011', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is weak', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(passwordUtil, 'isStrongPassword').mockReturnValue(false);

      await expect(
        service.changePassword('507f1f77bcf86cd799439011', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllFarmers', () => {
    it('should return paginated list of farmers', async () => {
      const filters: GetAllFarmersDto = {
        page: 1,
        limit: 20,
      };

      const mockFarmers = [
        {
          _id: '507f1f77bcf86cd799439011',
          user_id: '507f1f77bcf86cd799439012',
          first_name: 'John',
          last_name: 'Farmer',
          full_name: 'John Farmer',
          lga: 'Oshodi-Isolo',
          farm_size_hectares: 5.5,
          total_sales: 100,
          total_earnings: 5000000,
          completed_sales: 95,
          listings_count: 20,
          credit_score: 720,
          loan_defaults: 0,
          active_loan: false,
          average_rating: 4.5,
          total_ratings: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439012',
          phone: '08012345678',
          status: 'active',
        },
      ];

      mockFarmerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockFarmers),
            }),
          }),
        }),
      });
      mockFarmerModel.countDocuments.mockResolvedValue(1);
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUsers),
      });

      const result = await service.getAllFarmers(filters);

      expect(result.farmers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getFarmerById', () => {
    it('should return farmer by ID', async () => {
      const mockFarmer = {
        _id: '507f1f77bcf86cd799439011',
        user_id: '507f1f77bcf86cd799439012',
        first_name: 'John',
        last_name: 'Farmer',
        full_name: 'John Farmer',
        lga: 'Oshodi-Isolo',
        farm_size_hectares: 5.5,
        total_sales: 100,
        total_earnings: 5000000,
        completed_sales: 95,
        listings_count: 20,
        credit_score: 720,
        loan_defaults: 0,
        active_loan: false,
        average_rating: 4.5,
        total_ratings: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        phone: '08012345678',
        status: 'active',
      };

      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.getFarmerById('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
    });

    it('should throw NotFoundException if farmer not found', async () => {
      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      await expect(service.getFarmerById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllBuyers', () => {
    it('should return paginated list of buyers', async () => {
      const filters: GetAllBuyersDto = {
        page: 1,
        limit: 20,
      };

      const mockBuyers = [
        {
          _id: '507f1f77bcf86cd799439011',
          user_id: '507f1f77bcf86cd799439012',
          first_name: 'Jane',
          last_name: 'Buyer',
          full_name: 'Jane Buyer',
          business_name: 'Jane Processors',
          lga: 'Oshodi-Isolo',
          buyer_type: 'processor',
          total_purchases: 50,
          total_spent: 10000000,
          completed_orders: 48,
          average_rating: 4.7,
          total_ratings: 40,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439012',
          phone: '08087654321',
          status: 'active',
        },
      ];

      mockBuyerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockBuyers),
            }),
          }),
        }),
      });
      mockBuyerModel.countDocuments.mockResolvedValue(1);
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUsers),
      });

      const result = await service.getAllBuyers(filters);

      expect(result.buyers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getBuyerById', () => {
    it('should return buyer by ID', async () => {
      const mockBuyer = {
        _id: '507f1f77bcf86cd799439011',
        user_id: '507f1f77bcf86cd799439012',
        first_name: 'Jane',
        last_name: 'Buyer',
        full_name: 'Jane Buyer',
        business_name: 'Jane Processors',
        lga: 'Oshodi-Isolo',
        buyer_type: 'processor',
        total_purchases: 50,
        total_spent: 10000000,
        completed_orders: 48,
        average_rating: 4.7,
        total_ratings: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        phone: '08087654321',
        status: 'active',
      };

      mockBuyerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBuyer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.getBuyerById('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.firstName).toBe('Jane');
    });

    it('should throw NotFoundException if buyer not found', async () => {
      mockBuyerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      await expect(service.getBuyerById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activateAdmin', () => {
    it('should activate admin successfully', async () => {
      const inactiveAdmin = { ...mockAdmin, is_active: false };
      repository.findById.mockResolvedValue(inactiveAdmin as any);
      repository.update.mockResolvedValue({
        ...mockAdmin,
        is_active: true,
      } as any);

      const result = await service.activateAdmin('507f1f77bcf86cd799439011', {
        reason: 'Reactivating account',
      });

      expect(repository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          isActive: true,
        },
      );
      expect(result.message).toContain('successfully activated');
    });

    it('should throw NotFoundException if admin not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.activateAdmin('nonexistent', { reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateAdmin', () => {
    it('should deactivate admin successfully', async () => {
      repository.findById.mockResolvedValue(mockAdmin as any);
      repository.update.mockResolvedValue({
        ...mockAdmin,
        is_active: false,
      } as any);

      const result = await service.deactivateAdmin('507f1f77bcf86cd799439011', {
        reason: 'Policy violation',
      });

      expect(repository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          isActive: false,
        },
      );
      expect(result.message).toContain('successfully deactivated');
    });
  });

  describe('getAllAdmins', () => {
    it('should return paginated list of admins', async () => {
      const filters = { page: 1, limit: 20, search: 'john' };
      const mockAdmins = [mockAdmin];

      repository.findAllWithQuery.mockResolvedValue(mockAdmins as any);
      repository.countWithQuery.mockResolvedValue(1);

      const result = await service.getAllAdmins(filters);

      expect(result.admins).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('updateFarmer', () => {
    it('should update farmer successfully', async () => {
      const mockFarmer = {
        _id: '507f1f77bcf86cd799439011',
        user_id: '507f1f77bcf86cd799439012',
        first_name: 'John',
        last_name: 'Farmer',
      };
      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        phone: '08012345678',
        status: 'active',
      };

      // Mock with proper chaining
      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      mockFarmerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockFarmer, first_name: 'Updated' }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.updateFarmer('507f1f77bcf86cd799439011', {
        firstName: 'Updated',
      });

      expect(result).toBeDefined();
    });
  });

  describe('deactivateFarmer', () => {
    it('should deactivate farmer successfully', async () => {
      const mockFarmer = {
        _id: '507f1f77bcf86cd799439011',
        user_id: '507f1f77bcf86cd799439012',
        first_name: 'John',
        last_name: 'Farmer',
      };
      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        phone: '08012345678',
        status: 'active',
      };

      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUser, status: 'inactive' }),
      });

      const result = await service.deactivateFarmer('507f1f77bcf86cd799439011');

      expect(result.message).toContain('successfully deactivated');
    });
  });

  describe('activateFarmer', () => {
    it('should activate farmer successfully', async () => {
      const mockFarmer = {
        _id: '507f1f77bcf86cd799439011',
        user_id: '507f1f77bcf86cd799439012',
        first_name: 'John',
        last_name: 'Farmer',
      };
      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        phone: '08012345678',
        status: 'inactive',
      };

      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFarmer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUser, status: 'active' }),
      });

      const result = await service.activateFarmer('507f1f77bcf86cd799439011');

      expect(result.message).toContain('successfully activated');
    });
  });

  describe('getDashboardKPIs', () => {
    it('should return comprehensive dashboard KPIs', async () => {
      // Mock transaction aggregations
      mockTransactionModel.aggregate.mockResolvedValue([
        { totalTransactions: 1500, totalValue: 50000000 },
      ]);
      mockTransactionModel.countDocuments.mockResolvedValue(1450);
      mockTransactionModel.find.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(25),
      });

      // Mock farmer aggregations with proper chaining
      mockFarmerModel.countDocuments.mockResolvedValue(500);
      mockUserModel.find.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(480),
      });

      // Mock purchase aggregations
      mockPurchaseModel.countDocuments.mockResolvedValue(800);
      mockPurchaseModel.aggregate.mockResolvedValue([{ totalValue: 25000000 }]);

      // Mock USSD session aggregations
      mockUssdSessionModel.countDocuments.mockResolvedValue(2500);
      mockUssdSessionModel.find.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(15),
      });
      mockUssdSessionModel.aggregate.mockResolvedValue([
        { _id: 'MTN', count: 1200 },
        { _id: 'GLO', count: 800 },
      ]);
      mockUssdSessionModel.distinct.mockResolvedValue(
        Array.from({ length: 450 }, (_, i) => `user${i}`),
      );

      const result = await service.getDashboardKPIs();

      expect(result).toBeDefined();
      expect(result.transactions).toBeDefined();
      expect(result.farmers).toBeDefined();
      expect(result.purchases).toBeDefined();
      expect(result.ussdSessions).toBeDefined();
      expect(result.systemHealth).toBeDefined();
    });
  });

  describe('introspectToken', () => {
    it('should introspect valid token', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'test@farmconnect.com',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      jwtService.verify.mockReturnValue(payload);

      const result = await service.introspectToken('valid-token');

      expect(result.active).toBe(true);
      expect(result.sub).toBe(payload.sub);
      expect(result.email).toBe(payload.email);
    });

    it('should return inactive for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.introspectToken('invalid-token');

      expect(result.active).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@farmconnect.com',
        password: 'Password123',
      };

      repository.findByEmail.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('jwt-token');
      expect(result.email).toBe(mockAdmin.email);
      expect(result.adminId).toBe(String(mockAdmin._id));
    });
  });

  describe('fundUserWallet', () => {
    it('should fund user wallet successfully', async () => {
      const fundDto = {
        userId: '507f1f77bcf86cd799439012',
        amount: 50000,
        reason: 'Bonus credit',
      };

      // Mock wallet service with correct method name
      const mockWalletService = {
        adminFundWallet: jest.fn().mockResolvedValue({
          userId: fundDto.userId,
          balance: 100000,
          lastFunded: new Date(),
        }),
      };

      service.setWalletService(mockWalletService);

      const result = await service.fundUserWallet(fundDto);

      expect(result.message).toContain('funded successfully');
      expect(result.wallet).toBeDefined();
    });
  });

  describe('setUserWithdrawalAccount', () => {
    it('should set withdrawal account successfully', async () => {
      const setAccountDto = {
        userId: '507f1f77bcf86cd799439012',
        bankName: 'GTBank',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'John Farmer',
        bvn: '12345678901',
      };

      // Mock wallet service
      const mockWalletService = {
        setWithdrawalAccount: jest.fn().mockResolvedValue({
          userId: setAccountDto.userId,
          withdrawalAccount: {
            bankName: setAccountDto.bankName,
            accountNumber: setAccountDto.accountNumber,
            accountName: setAccountDto.accountName,
          },
        }),
      };

      service.setWalletService(mockWalletService);

      const result = await service.setUserWithdrawalAccount(setAccountDto);

      expect(result.message).toContain('successfully');
      expect(result.wallet).toBeDefined();
    });
  });

  describe('getLoanKPIs', () => {
    it('should return loan KPIs', async () => {
      mockLoanModel.countDocuments.mockResolvedValue(150);
      mockLoanModel.aggregate.mockResolvedValue([
        { totalValue: 15000000 },
        { averageAmount: 100000 },
      ]);

      const result = await service.getLoanKPIs();

      expect(result).toBeDefined();
      expect(typeof result.totalLoans).toBe('number');
      expect(typeof result.totalLoanValue).toBe('number');
    });
  });

  describe('getAllLoans', () => {
    it('should return paginated loans', async () => {
      const filters = { page: 1, limit: 20 };
      const mockLoans = [
        {
          _id: '507f1f77bcf86cd799439011',
          farmerId: '507f1f77bcf86cd799439012',
          amount: 100000,
          status: 'active',
        },
      ];

      mockLoanRepository.findAll.mockResolvedValue(mockLoans);
      mockLoanRepository.countByStatus.mockResolvedValue(1);

      const result = await service.getAllLoans(filters);

      expect(result.loans).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getLoanRequests', () => {
    it('should return loan requests', async () => {
      const filters = { page: 1, limit: 20 };
      const mockRequests = [
        {
          _id: '507f1f77bcf86cd799439011',
          farmerId: '507f1f77bcf86cd799439012',
          amount: 100000,
          status: 'pending',
        },
      ];

      mockLoanRepository.findByStatus.mockResolvedValue(mockRequests);
      mockLoanRepository.countByStatus.mockResolvedValue(1);

      const result = await service.getLoanRequests(filters);

      expect(result.loanRequests).toHaveLength(1);
    });
  });

  describe('createLoan', () => {
    it('should create loan successfully', async () => {
      const createDto = {
        farmerId: '507f1f77bcf86cd799439012',
        amount: 100000,
        purpose: 'Seeds and fertilizer',
        repaymentTerms: '6 months',
      };

      const mockLoan = {
        _id: '507f1f77bcf86cd799439011',
        ...createDto,
        status: 'approved',
        reference: 'FL240001',
        createdAt: new Date(),
      };

      mockFarmerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: createDto.farmerId }),
      });
      mockLoanModel.create.mockResolvedValue(mockLoan);
      mockSmsService.sendSms.mockResolvedValue(undefined);

      const result = await service.createLoan(createDto as any);

      expect(result).toBeDefined();
      expect(result.status).toBe('approved');
    });
  });

  describe('approveLoanRequest', () => {
    it('should approve loan request successfully', async () => {
      const approveDto = {
        pickupLocation: 'Main Branch',
        pickupDate: new Date(),
        notes: 'Approved for full amount',
      };

      const mockLoanRequest = {
        _id: '507f1f77bcf86cd799439011',
        farmerId: '507f1f77bcf86cd799439012',
        amount: 100000,
        status: 'pending',
      };

      const approvedLoan = {
        ...mockLoanRequest,
        status: 'approved',
        pickupLocation: approveDto.pickupLocation,
        approvedAt: new Date(),
      };

      mockLoanRepository.findById.mockResolvedValue(mockLoanRequest);
      mockLoanModel.create.mockResolvedValue(approvedLoan);
      mockSmsService.sendSms.mockResolvedValue(undefined);

      const result = await service.approveLoanRequest(
        '507f1f77bcf86cd799439011',
        approveDto as any,
      );

      expect(result.status).toBe('approved');
    });
  });

  describe('activateLoan', () => {
    it('should activate approved loan', async () => {
      const mockLoan = {
        _id: '507f1f77bcf86cd799439011',
        farmerId: '507f1f77bcf86cd799439012',
        status: 'approved',
        pickupDate: new Date(Date.now() - 86400000), // Yesterday
      };

      const activatedLoan = {
        ...mockLoan,
        status: 'active',
        activatedAt: new Date(),
      };

      mockLoanRepository.findById.mockResolvedValue(mockLoan);
      mockLoanModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activatedLoan),
      });
      mockSmsService.sendSms.mockResolvedValue(undefined);

      const result = await service.activateLoan('507f1f77bcf86cd799439011');

      expect(result.status).toBe('active');
    });
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        _id: '507f1f77bcf86cd799439011',
        cassavaPricePerKg: 500,
        maxLoanAmount: 500000,
        loanInterestRate: 5,
      };

      mockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(result).toBeDefined();
      expect(result.cassavaPricePerKg).toBe(500);
    });

    it('should create default settings if none exist', async () => {
      const defaultSettings = {
        cassavaPricePerKg: 500,
        maxLoanAmount: 1000000,
        loanInterestRate: 10,
      };

      mockSettingsModel.findOne.mockResolvedValue(null);
      mockSettingsModel.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...defaultSettings,
      });

      const result = await service.getSettings();

      expect(result).toBeDefined();
      expect(mockSettingsModel.create).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const updateDto = {
        cassavaPricePerKg: 600,
        maxLoanAmount: 1500000,
      };

      const updatedSettings = {
        _id: '507f1f77bcf86cd799439011',
        ...updateDto,
        updatedBy: 'admin-id',
        updatedAt: new Date(),
      };

      mockSettingsModel.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(updateDto, 'admin-id');

      expect(result).toBeDefined();
      expect(result.cassavaPricePerKg).toBe(600);
    });
  });
});
