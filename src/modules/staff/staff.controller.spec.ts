/**
 * StaffController Unit Tests
 * 
 * Test Coverage:
 * - 24 comprehensive unit tests covering all controller endpoints
 * - Register staff functionality (4 tests)
 * - Approve staff functionality (4 tests)  
 * - Get all staff functionality (3 tests)
 * - Get staff by ID functionality (3 tests)
 * - Get staff by phone functionality (3 tests)
 * - Update staff functionality (3 tests)
 * - Deactivate staff functionality (2 tests)
 * - Reactivate staff functionality (2 tests)
 * 
 * All tests validate proper HTTP responses, error handling, 
 * and integration with StaffService methods.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DeactivateStaffDto } from './dto/deactivate-staff.dto';

describe('StaffController', () => {
  let controller: StaffController;
  let service: jest.Mocked<StaffService>;

  const mockStaffId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockAdminId = new Types.ObjectId().toString();

  const mockStaffResponse = {
    id: mockStaffId,
    userId: mockUserId,
    phone: '8012345678',
    firstName: 'John',
    lastName: 'Okafor',
    fullName: 'John Okafor',
    lga: 'Ikeja',
    role: 'field_officer',
    department: 'operations',
    employeeId: 'EMP-20251213-0001',
    isActive: false,
    isApproved: false,
    monthlySalary: 15000000,
    createdAt: new Date('2025-01-01'),
  };

  const mockApprovedStaffResponse = {
    ...mockStaffResponse,
    isActive: true,
    isApproved: true,
    dateApproved: new Date(),
    approvedBy: mockAdminId,
  };

  const mockPaginatedResponse = {
    staff: [mockStaffResponse],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockStaffService = {
    register: jest.fn(),
    approveStaff: jest.fn(),
    getAllStaff: jest.fn(),
    getStaffById: jest.fn(),
    getStaffByPhone: jest.fn(),
    updateStaff: jest.fn(),
    deactivateStaff: jest.fn(),
    reactivateStaff: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        {
          provide: StaffService,
          useValue: mockStaffService,
        },
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
    service = module.get<StaffService>(StaffService) as jest.Mocked<StaffService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterStaffDto = {
      phone: '8012345678',
      pin: '1234',
      firstName: 'John',
      lastName: 'Okafor',
      lga: 'Ikeja',
      role: 'field_officer',
      department: 'operations',
    };

    it('should register a new staff successfully', async () => {
      service.register.mockResolvedValue(mockStaffResponse);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        success: true,
        data: mockStaffResponse,
        message: 'Staff registered successfully. Awaiting approval.',
        timestamp: expect.any(String),
      });
    });

    it('should throw BadRequestException if phone already exists', async () => {
      service.register.mockRejectedValue(
        new BadRequestException('Phone number already registered'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return correct response structure', async () => {
      service.register.mockResolvedValue(mockStaffResponse);

      const result = await controller.register(registerDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });

    it('should call service with correct parameters', async () => {
      service.register.mockResolvedValue(mockStaffResponse);

      await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledTimes(1);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('approveStaff', () => {
    it('should approve staff successfully', async () => {
      service.approveStaff.mockResolvedValue(mockApprovedStaffResponse);

      const result = await controller.approveStaff(mockStaffId, mockAdminId);

      expect(service.approveStaff).toHaveBeenCalledWith(mockStaffId, mockAdminId);
      expect(result).toEqual({
        success: true,
        data: mockApprovedStaffResponse,
        message: 'Staff approved successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      service.approveStaff.mockRejectedValue(new NotFoundException('Staff not found'));

      await expect(controller.approveStaff(mockStaffId, mockAdminId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if already approved', async () => {
      service.approveStaff.mockRejectedValue(
        new BadRequestException('Staff is already approved'),
      );

      await expect(controller.approveStaff(mockStaffId, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return approved staff data', async () => {
      service.approveStaff.mockResolvedValue(mockApprovedStaffResponse);

      const result = await controller.approveStaff(mockStaffId, mockAdminId);

      expect(result.data).toHaveProperty('isApproved', true);
      expect(result.data).toHaveProperty('isActive', true);
      expect(result.data).toHaveProperty('dateApproved');
    });
  });

  describe('getAllStaff', () => {
    it('should return paginated staff list', async () => {
      service.getAllStaff.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getAllStaff();

      expect(service.getAllStaff).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        status: undefined,
        role: undefined,
        department: undefined,
        is_approved: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: mockPaginatedResponse,
        message: 'Staff list retrieved successfully',
        timestamp: expect.any(String),
      });
    });

    it('should apply filters when provided', async () => {
      service.getAllStaff.mockResolvedValue(mockPaginatedResponse);

      await controller.getAllStaff(1, 10, 'John', 'active', 'manager', 'finance', true);

      expect(service.getAllStaff).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'John',
        status: 'active',
        role: 'manager',
        department: 'finance',
        is_approved: true,
      });
    });

    it('should return correct pagination metadata', async () => {
      service.getAllStaff.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getAllStaff(1, 20);

      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('limit');
      expect(result.data).toHaveProperty('totalPages');
    });
  });

  describe('getStaffById', () => {
    const mockDetailedStaff = {
      ...mockApprovedStaffResponse,
      wallet: {
        balance: 5000000,
        pensionBalance: 1000000,
        totalEarned: 10000000,
      },
    };

    it('should return staff details by ID', async () => {
      service.getStaffById.mockResolvedValue(mockDetailedStaff);

      const result = await controller.getStaffById(mockStaffId);

      expect(service.getStaffById).toHaveBeenCalledWith(mockStaffId);
      expect(result).toEqual({
        success: true,
        data: mockDetailedStaff,
        message: 'Staff details retrieved successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      service.getStaffById.mockRejectedValue(new NotFoundException('Staff not found'));

      await expect(controller.getStaffById(mockStaffId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include wallet information', async () => {
      service.getStaffById.mockResolvedValue(mockDetailedStaff);

      const result = await controller.getStaffById(mockStaffId);

      expect(result.data).toHaveProperty('wallet');
      expect(result.data.wallet).toHaveProperty('balance');
      expect(result.data.wallet).toHaveProperty('pensionBalance');
    });
  });

  describe('getStaffByPhone', () => {
    it('should return staff by phone number', async () => {
      service.getStaffByPhone.mockResolvedValue(mockStaffResponse);

      const result = await controller.getStaffByPhone('8012345678');

      expect(service.getStaffByPhone).toHaveBeenCalledWith('8012345678');
      expect(result).toEqual({
        success: true,
        data: mockStaffResponse,
        message: 'Staff details retrieved successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      service.getStaffByPhone.mockRejectedValue(
        new NotFoundException('Staff not found'),
      );

      await expect(controller.getStaffByPhone('8012345678')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle phone number format', async () => {
      service.getStaffByPhone.mockResolvedValue(mockStaffResponse);

      await controller.getStaffByPhone('+2348012345678');

      expect(service.getStaffByPhone).toHaveBeenCalledWith('+2348012345678');
    });
  });

  describe('updateStaff', () => {
    const updateDto: UpdateStaffDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'manager',
      monthlySalary: 20000000,
    };

    it('should update staff successfully', async () => {
      const updatedStaff = {
        ...mockStaffResponse,
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'manager',
        monthlySalary: 20000000,
      };
      service.updateStaff.mockResolvedValue(updatedStaff);

      const result = await controller.updateStaff(mockStaffId, updateDto);

      expect(service.updateStaff).toHaveBeenCalledWith(mockStaffId, updateDto);
      expect(result).toEqual({
        success: true,
        data: updatedStaff,
        message: 'Staff updated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException if staff not found', async () => {
      service.updateStaff.mockRejectedValue(new NotFoundException('Staff not found'));

      await expect(controller.updateStaff(mockStaffId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateStaffDto = { role: 'supervisor' };
      service.updateStaff.mockResolvedValue({
        ...mockStaffResponse,
        role: 'supervisor',
      });

      await controller.updateStaff(mockStaffId, partialUpdate);

      expect(service.updateStaff).toHaveBeenCalledWith(mockStaffId, partialUpdate);
    });
  });

  describe('deactivateStaff', () => {
    const deactivateDto: DeactivateStaffDto = {
      reason: 'Performance issues and repeated policy violations',
    };

    it('should deactivate staff successfully', async () => {
      const deactivatedStaff = {
        id: mockStaffId,
        isActive: false,
        deactivationReason: deactivateDto.reason,
        deactivatedAt: new Date(),
      };
      service.deactivateStaff.mockResolvedValue(deactivatedStaff);

      const result = await controller.deactivateStaff(mockStaffId, deactivateDto);

      expect(service.deactivateStaff).toHaveBeenCalledWith(mockStaffId, deactivateDto);
      expect(result).toEqual({
        success: true,
        data: deactivatedStaff,
        message: 'Staff deactivated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw BadRequestException if already deactivated', async () => {
      service.deactivateStaff.mockRejectedValue(
        new BadRequestException('Staff is already deactivated'),
      );

      await expect(
        controller.deactivateStaff(mockStaffId, deactivateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivateStaff', () => {
    it('should reactivate staff successfully', async () => {
      const reactivatedStaff = {
        id: mockStaffId,
        isActive: true,
      };
      service.reactivateStaff.mockResolvedValue(reactivatedStaff);

      const result = await controller.reactivateStaff(mockStaffId);

      expect(service.reactivateStaff).toHaveBeenCalledWith(mockStaffId);
      expect(result).toEqual({
        success: true,
        data: reactivatedStaff,
        message: 'Staff reactivated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should throw BadRequestException if not approved', async () => {
      service.reactivateStaff.mockRejectedValue(
        new BadRequestException('Staff must be approved before reactivation'),
      );

      await expect(controller.reactivateStaff(mockStaffId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
