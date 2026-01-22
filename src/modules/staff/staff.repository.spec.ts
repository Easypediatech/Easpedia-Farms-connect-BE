/**
 * StaffRepository Unit Tests
 * 
 * Test Coverage:
 * - 15 comprehensive unit tests covering all repository operations
 * - Create staff functionality (2 tests)
 * - Find operations (5 tests)
 * - Update operations (2 tests)
 * - Approve staff functionality (2 tests)
 * - Deactivate staff functionality (2 tests)
 * - Get all staff with filters (2 tests)
 * 
 * All tests validate proper database interactions and data transformations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StaffRepository } from './staff.repository';
import { User, UserDocument } from '../../schemas/user.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { RegisterStaffDto } from './dto/register-staff.dto';

describe('StaffRepository', () => {
  let repository: StaffRepository;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let staffModel: jest.Mocked<Model<StaffDocument>>;

  const mockUserId = new Types.ObjectId();
  const mockStaffId = new Types.ObjectId();
  const mockAdminId = new Types.ObjectId();

  const mockUser = {
    _id: mockUserId,
    phone: '8012345678',
    phone_code: '234',
    password: 'hashedpin123',
    user_type: 'staff',
    status: 'inactive',
    save: jest.fn().mockResolvedValue(this),
  };

  const mockStaff = {
    _id: mockStaffId,
    user_id: mockUserId,
    first_name: 'John',
    last_name: 'Okafor',
    lga: 'Ikeja',
    role: 'field_officer',
    department: 'operations',
    employee_id: 'EMP-20251213-0001',
    is_active: false,
    is_approved: false,
    monthly_salary: 15000000,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  const mockStaffModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Staff.name),
          useValue: mockStaffModel,
        },
      ],
    }).compile();

    repository = module.get<StaffRepository>(StaffRepository);
    userModel = module.get(getModelToken(User.name));
    staffModel = module.get(getModelToken(Staff.name));

    jest.clearAllMocks();
  });

  describe('findUserByPhone', () => {
    it('should find user by phone number', async () => {
      const execMock = jest.fn().mockResolvedValue(mockUser);
      mockUserModel.findOne.mockReturnValue({ exec: execMock } as any);

      const result = await repository.findUserByPhone('8012345678');

      expect(userModel.findOne).toHaveBeenCalledWith({ phone: '8012345678' });
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if user not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockUserModel.findOne.mockReturnValue({ exec: execMock } as any);

      const result = await repository.findUserByPhone('8012345678');

      expect(result).toBeUndefined();
    });
  });

  describe('findStaffByUserId', () => {
    it('should find staff by user ID', async () => {
      const execMock = jest.fn().mockResolvedValue(mockStaff);
      mockStaffModel.findOne.mockReturnValue({ exec: execMock } as any);

      const result = await repository.findStaffByUserId(mockUserId.toString());

      expect(staffModel.findOne).toHaveBeenCalledWith({
        user_id: mockUserId.toString(),
      });
      expect(result).toEqual(mockStaff);
    });

    it('should return undefined if staff not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockStaffModel.findOne.mockReturnValue({ exec: execMock } as any);

      const result = await repository.findStaffByUserId(mockUserId.toString());

      expect(result).toBeUndefined();
    });
  });

  describe('createStaff', () => {
    const registerDto: RegisterStaffDto = {
      phone: '8012345678',
      firstName: 'John',
      lastName: 'Okafor',
      lga: 'Ikeja',
      role: 'field_officer',
      department: 'operations',
      pin: '1234',
    };

    it('should create staff with user and profile', async () => {
      mockUserModel.create.mockResolvedValue(mockUser as any);
      mockStaffModel.create.mockResolvedValue(mockStaff as any);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      const result = await repository.createStaff(registerDto);

      expect(userModel.create).toHaveBeenCalledWith({
        phone: registerDto.phone,
        phone_code: '234',
        password: registerDto.pin,
        user_type: 'staff',
        ussd_stage: 'menu',
        status: 'inactive',
      });
      expect(staffModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser._id,
          first_name: registerDto.firstName,
          last_name: registerDto.lastName,
          lga: registerDto.lga,
          role: registerDto.role,
          department: registerDto.department,
          is_active: false,
          is_approved: false,
        }),
      );
      expect(result).toEqual({ user: mockUser, staff: mockStaff });
    });

    it('should generate employee ID during creation', async () => {
      mockUserModel.create.mockResolvedValue(mockUser as any);
      mockStaffModel.create.mockResolvedValue(mockStaff as any);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      await repository.createStaff(registerDto);

      const createCall = mockStaffModel.create.mock.calls[0][0];
      expect(createCall.employee_id).toMatch(/^EMP-\d{8}-\d{4}$/);
    });
  });

  describe('updateStaff', () => {
    it('should update staff information', async () => {
      const updateData = { first_name: 'Jane', role: 'manager' };
      const execMock = jest.fn().mockResolvedValue({ ...mockStaff, ...updateData });
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);

      const result = await repository.updateStaff(mockStaffId.toString(), updateData);

      expect(staffModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStaffId.toString(),
        updateData,
        { new: true },
      );
      expect(result).toBeDefined();
      expect(result?.first_name).toBe('Jane');
    });

    it('should return undefined if staff not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);

      const result = await repository.updateStaff(mockStaffId.toString(), {
        first_name: 'Jane',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('approveStaff', () => {
    it('should approve staff and update user status', async () => {
      const approvedStaff = {
        ...mockStaff,
        is_approved: true,
        is_active: true,
        date_approved: expect.any(Date),
        approved_by: mockAdminId,
      };
      const execMock = jest.fn().mockResolvedValue(approvedStaff);
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      const result = await repository.approveStaff(
        mockStaffId.toString(),
        mockAdminId,
      );

      expect(staffModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStaffId.toString(),
        {
          is_approved: true,
          is_active: true,
          date_approved: expect.any(Date),
          approved_by: mockAdminId,
        },
        { new: true },
      );
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUserId, {
        status: 'active',
      });
      expect(result?.is_approved).toBe(true);
      expect(result?.is_active).toBe(true);
    });

    it('should not update user if staff approval fails', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);

      const result = await repository.approveStaff(
        mockStaffId.toString(),
        mockAdminId,
      );

      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('deactivateStaff', () => {
    it('should deactivate staff and update user status', async () => {
      const deactivatedStaff = {
        ...mockStaff,
        is_active: false,
        deactivation_reason: 'Performance issues',
        deactivated_at: expect.any(Date),
      };
      const execMock = jest.fn().mockResolvedValue(deactivatedStaff);
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      const result = await repository.deactivateStaff(
        mockStaffId.toString(),
        'Performance issues',
      );

      expect(staffModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStaffId.toString(),
        {
          is_active: false,
          deactivation_reason: 'Performance issues',
          deactivated_at: expect.any(Date),
        },
        { new: true },
      );
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUserId, {
        status: 'inactive',
      });
      expect(result?.is_active).toBe(false);
    });

    it('should not update user if staff deactivation fails', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockStaffModel.findByIdAndUpdate.mockReturnValue({ exec: execMock } as any);

      const result = await repository.deactivateStaff(
        mockStaffId.toString(),
        'Test reason',
      );

      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('findStaffById', () => {
    it('should return staff with user', async () => {
      const execMock = jest.fn().mockResolvedValue(mockStaff);
      mockStaffModel.findById.mockReturnValue({ exec: execMock } as any);
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await repository.findStaffById(mockStaffId.toString());

      expect(staffModel.findById).toHaveBeenCalledWith(mockStaffId.toString());
      expect(userModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ user: mockUser, staff: mockStaff });
    });

    it('should return undefined if staff not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockStaffModel.findById.mockReturnValue({ exec: execMock } as any);

      const result = await repository.findStaffById(mockStaffId.toString());

      expect(result).toBeUndefined();
    });
  });

  describe('findAllStaff', () => {
    it('should return paginated staff list', async () => {
      const mockStaffList = [mockStaff, mockStaff];
      mockStaffModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockStaffList),
      } as any);
      mockStaffModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      } as any);
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await repository.findAllStaff({
        page: 1,
        limit: 20,
      });

      expect(staffModel.find).toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.staff).toHaveLength(2);
    });

    it('should apply filters when provided', async () => {
      mockStaffModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);
      mockStaffModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await repository.findAllStaff({
        page: 1,
        limit: 20,
        role: 'manager',
        department: 'finance',
        is_approved: true,
      });

      expect(staffModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'manager',
          department: 'finance',
          is_approved: true,
        }),
      );
    });
  });
});
