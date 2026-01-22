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

describe('AdminService - Core Functions', () => {
  let service: AdminService;
  let repository: jest.Mocked<AdminRepository>;
  let jwtService: jest.Mocked<JwtService>;

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

  // Simple mocks for all dependencies
  const createMockModel = () => ({
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  });

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
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findWithPagination: jest.fn(),
          },
        },
        {
          provide: LoanRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            findByStatus: jest.fn(),
            countByStatus: jest.fn(),
            findLoanRequests: jest.fn(),
            getFarmerLoanCount: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Farmer.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Buyer.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Order.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Purchase.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(UssdSession.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Loan.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(LoanType.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Settings.name),
          useValue: createMockModel(),
        },
        {
          provide: StaffRepository,
          useValue: {
            findStaffById: jest.fn(),
          },
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

  describe('login', () => {
    const loginDto: LoginAdminDto = {
      email: 'test@farmconnect.com',
      password: 'Password123',
    };

    it('should login admin successfully', async () => {
      repository.findByEmail.mockResolvedValue(mockAdmin as any);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(
        'test@farmconnect.com',
      );
      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(
        'Password123',
        'hashedPassword123',
      );
      expect(result.accessToken).toBe('jwt-token');
    });

    it('should throw InvalidCredentialsException if admin not found', async () => {
      repository.findByEmail.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });
  });

  describe('introspectToken', () => {
    it('should introspect valid token', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'test@farmconnect.com',
        role: 'admin',
        type: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      jwtService.verify.mockReturnValue(payload);

      const result = await service.introspectToken('valid-token');

      expect(result.active).toBe(true);
      expect(result.adminId).toBe('507f1f77bcf86cd799439011');
      expect(result.email).toBe('test@farmconnect.com');
      expect(result.role).toBe('admin');
      expect(result.type).toBe('admin');
    });

    it('should return inactive for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.introspectToken('invalid-token');

      expect(result.active).toBe(false);
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
});
