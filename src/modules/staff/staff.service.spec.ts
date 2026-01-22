/**
 * StaffService Unit Tests
 * 
 * Test Coverage:
 * - 22 comprehensive unit tests covering all service business logic
 * - Registration functionality (3 tests) 
 * - Staff approval functionality (4 tests)
 * - Get all staff functionality (2 tests)
 * - Get staff by ID functionality (3 tests)
 * - Get staff by phone functionality (3 tests)
 * - Update staff functionality (3 tests)
 * - Deactivate staff functionality (2 tests)
 * - Reactivate staff functionality (2 tests)
 * 
 * All tests validate proper business logic, error handling,
 * database interactions, and wallet service integrations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { WalletService } from '../wallet/wallet.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DeactivateStaffDto } from './dto/deactivate-staff.dto';
import * as pinUtil from '../../common/utils/pin.util';

// Mock the pin utility functions
jest.mock('../../common/utils/pin.util', () => ({
  normalizePhoneNumber: jest.fn(),
}));

describe('StaffService', () => {
  let service: StaffService;
  let staffRepository: jest.Mocked<StaffRepository>;
  let walletService: jest.Mocked<WalletService>;

  const mockUserId = new Types.ObjectId();
  const mockStaffId = new Types.ObjectId();
  const mockAdminId = new Types.ObjectId();

  const mockUser = {
    _id: mockUserId,
    phone: '8012345678',
    phone_code: '234',
    password: 'hashedpin123',
    user_type: 'staff',
    ussd_stage: 'menu',
    status: 'inactive',
    last_login: new Date(),
    last_activity: new Date(),
    staff_profile_id: mockStaffId,
  };

  const mockStaff = {
    _id: mockStaffId,
    user_id: mockUserId,
    first_name: 'John',
    last_name: 'Okafor',
    full_name: 'John Okafor',
    lga: 'Ikeja',
    role: 'field_officer',
    department: 'operations',
    employee_id: 'EMP-20251213-0001',
    is_active: false,
    is_approved: false,
    monthly_salary: 15000000, // 150,000 in kobo
    total_salary_paid: 0,
    pension_contributions: 0,
    performance_rating: 0,
    total_ratings: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockApprovedStaff = {
    ...mockStaff,
    is_active: true,
    is_approved: true,
    date_approved: new Date(),
    approved_by: mockAdminId,
  };

  const mockWallet = {
    _id: new Types.ObjectId(),
    user_id: mockUserId,
    user_type: 'staff',
    balance: 0,
    escrow_balance: 0,
    savings_balance: 0,
    pension_balance: 0,
    total_earned: 0,
    total_spent: 0,
    total_withdrawn: 0,
    total_deposited: 0,
  };

  const mockStaffRepository = {
    findUserByPhone: jest.fn(),
    findStaffByUserId: jest.fn(),
    createStaff: jest.fn(),
    updateUser: jest.fn(),
    updateStaff: jest.fn(),
    approveStaff: jest.fn(),
    deactivateStaff: jest.fn(),
    findStaffById: jest.fn(),
    findAllStaff: jest.fn(),
  };

  const mockWalletService = {
    createWallet: jest.fn(),
    getWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: StaffRepository,
          useValue: mockStaffRepository,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    staffRepository = module.get(StaffRepository);
    walletService = module.get(WalletService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterStaffDto = {
      phone: '+2348012345678',
      firstName: 'John',
      lastName: 'Okafor',
      lga: 'Ikeja',
      role: 'field_officer',
      department: 'operations',
      pin: '1234',
    };

    it('should successfully register a new staff member', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue(null);
      mockStaffRepository.createStaff.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });

      const result = await service.register(registerDto);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('+2348012345678');
      expect(staffRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(staffRepository.createStaff).toHaveBeenCalledWith({
        ...registerDto,
        phone: '8012345678',
      });
      expect(result).toMatchObject({
        id: mockStaff._id,
        userId: mockUser._id,
        phone: mockUser.phone,
        firstName: mockStaff.first_name,
        lastName: mockStaff.last_name,
        employeeId: mockStaff.employee_id,
        isActive: false,
        isApproved: false,
      });
    });

    it('should throw BadRequestException if phone number already exists', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Phone number already registered',
      );
    });

    it('should normalize phone number before checking existence', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue(null);
      mockStaffRepository.createStaff.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });

      await service.register(registerDto);

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('+2348012345678');
      expect(staffRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
    });
  });

  describe('approveStaff', () => {
    it('should successfully approve staff and create wallet', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });
      mockStaffRepository.approveStaff.mockResolvedValue(mockApprovedStaff);
      mockWalletService.createWallet.mockResolvedValue(mockWallet as any);

      const result = await service.approveStaff(
        mockStaffId.toString(),
        mockAdminId.toString(),
      );

      expect(staffRepository.findStaffById).toHaveBeenCalledWith(
        mockStaffId.toString(),
      );
      expect(staffRepository.approveStaff).toHaveBeenCalledWith(
        mockStaffId.toString(),
        expect.any(Types.ObjectId),
      );
      expect(walletService.createWallet).toHaveBeenCalledWith(mockUserId, 'staff');
      expect(result).toMatchObject({
        id: mockApprovedStaff._id,
        isActive: true,
        isApproved: true,
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue(null);

      await expect(
        service.approveStaff(mockStaffId.toString(), mockAdminId.toString()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.approveStaff(mockStaffId.toString(), mockAdminId.toString()),
      ).rejects.toThrow('Staff not found');
    });

    it('should throw BadRequestException if staff already approved', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockApprovedStaff,
      });

      await expect(
        service.approveStaff(mockStaffId.toString(), mockAdminId.toString()),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveStaff(mockStaffId.toString(), mockAdminId.toString()),
      ).rejects.toThrow('Staff is already approved');
    });

    it('should continue even if wallet creation fails', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });
      mockStaffRepository.approveStaff.mockResolvedValue(mockApprovedStaff);
      mockWalletService.createWallet.mockRejectedValue(
        new Error('Wallet creation failed'),
      );

      const result = await service.approveStaff(
        mockStaffId.toString(),
        mockAdminId.toString(),
      );

      expect(result).toBeDefined();
      expect(result.isApproved).toBe(true);
    });
  });

  describe('getAllStaff', () => {
    it('should return paginated staff list', async () => {
      const mockStaffList = [
        { user: mockUser, staff: mockStaff },
        { user: mockUser, staff: mockApprovedStaff },
      ];

      mockStaffRepository.findAllStaff.mockResolvedValue({
        staff: mockStaffList,
        total: 2,
      });

      const result = await service.getAllStaff({
        page: 1,
        limit: 20,
      });

      expect(staffRepository.findAllStaff).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
        role: undefined,
        department: undefined,
        is_approved: undefined,
      });
      expect(result).toMatchObject({
        staff: expect.any(Array),
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(result.staff).toHaveLength(2);
    });

    it('should apply filters when provided', async () => {
      mockStaffRepository.findAllStaff.mockResolvedValue({
        staff: [],
        total: 0,
      });

      await service.getAllStaff({
        page: 1,
        limit: 10,
        search: 'John',
        role: 'field_officer',
        department: 'operations',
        is_approved: true,
      });

      expect(staffRepository.findAllStaff).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'John',
        status: undefined,
        role: 'field_officer',
        department: 'operations',
        is_approved: true,
      });
    });
  });

  describe('getStaffById', () => {
    it('should return staff details with wallet info', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockApprovedStaff,
      });
      mockWalletService.getWallet.mockResolvedValue(mockWallet as any);

      const result = await service.getStaffById(mockStaffId.toString());

      expect(staffRepository.findStaffById).toHaveBeenCalledWith(
        mockStaffId.toString(),
      );
      expect(walletService.getWallet).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockApprovedStaff._id,
        firstName: mockApprovedStaff.first_name,
        wallet: {
          balance: 0,
          pensionBalance: 0,
          totalEarned: 0,
        },
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue(null);

      await expect(service.getStaffById(mockStaffId.toString())).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getStaffById(mockStaffId.toString())).rejects.toThrow(
        'Staff not found',
      );
    });

    it('should return staff details even if wallet fetch fails', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockApprovedStaff,
      });
      mockWalletService.getWallet.mockRejectedValue(
        new Error('Wallet not found'),
      );

      const result = await service.getStaffById(mockStaffId.toString());

      expect(result).toBeDefined();
      expect(result.wallet).toBeNull();
    });
  });

  describe('getStaffByPhone', () => {
    it('should return staff by phone number', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue({
        ...mockUser,
        user_type: 'staff',
      });
      mockStaffRepository.findStaffByUserId.mockResolvedValue(mockStaff);

      const result = await service.getStaffByPhone('+2348012345678');

      expect(pinUtil.normalizePhoneNumber).toHaveBeenCalledWith('+2348012345678');
      expect(staffRepository.findUserByPhone).toHaveBeenCalledWith('8012345678');
      expect(result).toMatchObject({
        id: mockStaff._id,
        firstName: mockStaff.first_name,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue(null);

      await expect(service.getStaffByPhone('+2348012345678')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getStaffByPhone('+2348012345678')).rejects.toThrow(
        'Staff not found',
      );
    });

    it('should throw NotFoundException if user is not staff type', async () => {
      (pinUtil.normalizePhoneNumber as jest.Mock).mockReturnValue({
        phone: '8012345678',
        code: '234',
      });
      mockStaffRepository.findUserByPhone.mockResolvedValue({
        ...mockUser,
        user_type: 'farmer',
      });

      await expect(service.getStaffByPhone('+2348012345678')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStaff', () => {
    const updateDto: UpdateStaffDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'manager',
      monthlySalary: 20000000,
    };

    it('should successfully update staff information', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });
      mockStaffRepository.updateStaff.mockResolvedValue({
        ...mockStaff,
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'manager',
        monthly_salary: 20000000,
      });

      const result = await service.updateStaff(mockStaffId.toString(), updateDto);

      expect(staffRepository.findStaffById).toHaveBeenCalledWith(
        mockStaffId.toString(),
      );
      expect(staffRepository.updateStaff).toHaveBeenCalledWith(
        mockStaffId.toString(),
        {
          first_name: 'Jane',
          last_name: 'Doe',
          role: 'manager',
          monthly_salary: 20000000,
        },
      );
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
    });

    it('should throw NotFoundException if staff not found', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue(null);

      await expect(
        service.updateStaff(mockStaffId.toString(), updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if update fails', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockStaff,
      });
      mockStaffRepository.updateStaff.mockResolvedValue(null);

      await expect(
        service.updateStaff(mockStaffId.toString(), updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStaff(mockStaffId.toString(), updateDto),
      ).rejects.toThrow('Failed to update staff');
    });
  });

  describe('deactivateStaff', () => {
    const deactivateDto: DeactivateStaffDto = {
      reason: 'Performance issues and repeated policy violations',
    };

    it('should successfully deactivate staff', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: mockApprovedStaff,
      });
      mockStaffRepository.deactivateStaff.mockResolvedValue({
        ...mockApprovedStaff,
        is_active: false,
        deactivation_reason: deactivateDto.reason,
        deactivated_at: new Date(),
      });

      const result = await service.deactivateStaff(
        mockStaffId.toString(),
        deactivateDto,
      );

      expect(staffRepository.deactivateStaff).toHaveBeenCalledWith(
        mockStaffId.toString(),
        deactivateDto.reason,
      );
      expect(result.isActive).toBe(false);
      expect(result.deactivationReason).toBe(deactivateDto.reason);
    });

    it('should throw BadRequestException if staff already deactivated', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: { ...mockStaff, is_active: false },
      });

      await expect(
        service.deactivateStaff(mockStaffId.toString(), deactivateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deactivateStaff(mockStaffId.toString(), deactivateDto),
      ).rejects.toThrow('Staff is already deactivated');
    });
  });

  describe('reactivateStaff', () => {
    it('should successfully reactivate staff', async () => {
      const deactivatedStaff = {
        ...mockApprovedStaff,
        is_active: false,
        deactivation_reason: 'Test reason',
      };

      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: deactivatedStaff,
      });
      mockStaffRepository.updateStaff.mockResolvedValue({
        ...deactivatedStaff,
        is_active: true,
        deactivation_reason: undefined,
        deactivated_at: undefined,
      });
      mockStaffRepository.updateUser.mockResolvedValue({
        ...mockUser,
        status: 'active',
      });

      const result = await service.reactivateStaff(mockStaffId.toString());

      expect(staffRepository.updateStaff).toHaveBeenCalled();
      expect(staffRepository.updateUser).toHaveBeenCalledWith(
        mockUserId.toString(),
        { status: 'active' },
      );
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if staff not approved', async () => {
      mockStaffRepository.findStaffById.mockResolvedValue({
        user: mockUser,
        staff: { ...mockStaff, is_active: false, is_approved: false },
      });

      await expect(
        service.reactivateStaff(mockStaffId.toString()),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reactivateStaff(mockStaffId.toString()),
      ).rejects.toThrow('Staff must be approved before reactivation');
    });
  });
});
