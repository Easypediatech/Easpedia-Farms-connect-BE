import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import { RegisterStaffDto } from './dto/register-staff.dto';

export interface IStaffRepository {
  findUserByPhone(phone: string): Promise<UserDocument | undefined>;
  findUserById(userId: string): Promise<UserDocument | undefined>;
  findStaffByUserId(userId: string): Promise<StaffDocument | undefined>;
  findStaffById(
    staffId: string,
  ): Promise<{ user: UserDocument; staff: StaffDocument } | undefined>;
  findAllStaff(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
    department?: string;
    is_approved?: boolean;
  }): Promise<{
    staff: Array<{ user: UserDocument; staff: StaffDocument }>;
    total: number;
  }>;
  createStaff(
    registerDto: RegisterStaffDto,
  ): Promise<{ user: UserDocument; staff: StaffDocument }>;
  updateUser(
    userId: string,
    data: Partial<User>,
  ): Promise<UserDocument | undefined>;
  updateStaff(
    staffId: string,
    data: Partial<Staff>,
  ): Promise<StaffDocument | undefined>;
  approveStaff(
    staffId: string,
    approvedBy: Types.ObjectId,
  ): Promise<StaffDocument | undefined>;
  deactivateStaff(
    staffId: string,
    reason: string,
  ): Promise<StaffDocument | undefined>;
  deleteUser(userId: string): Promise<void>;
}

@Injectable()
export class StaffRepository implements IStaffRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Staff.name)
    private readonly staffModel: Model<StaffDocument>,
  ) {}

  async findUserByPhone(phone: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findOne({ phone }).exec();
    return user || undefined;
  }

  async findUserById(userId: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findById(userId).exec();
    return user || undefined;
  }

  async findStaffByUserId(userId: string): Promise<StaffDocument | undefined> {
    const staff = await this.staffModel.findOne({ user_id: userId }).exec();
    return staff || undefined;
  }

  async createStaff(
    registerDto: RegisterStaffDto,
  ): Promise<{ user: UserDocument; staff: StaffDocument }> {
    // Create user with hashed PIN (pre-save hook will hash it)
    const userData = {
      phone: registerDto.phone,
      phone_code: '234',
      password: registerDto.pin, // Will be hashed by pre-save hook
      user_type: 'staff',
      ussd_stage: 'menu',
      status: 'suspended', // Staff starts suspended until approved
    };

    const user = await this.userModel.create(userData);

    // Generate employee ID
    const employeeId = this.generateEmployeeId();

    // Create staff profile
    const staffData = {
      user_id: user._id,
      first_name: registerDto.firstName,
      last_name: registerDto.lastName,
      lga: registerDto.lga,
      role: registerDto.role,
      department: registerDto.department,
      employee_id: employeeId,
      is_active: false,
      is_approved: false,
      monthly_salary: registerDto.monthlySalary || 0,
    };

    const staff = await this.staffModel.create(staffData);

    // Update user with staff_profile_id
    await this.userModel.findByIdAndUpdate(user._id, {
      staff_profile_id: staff._id,
    });

    return { user, staff };
  }

  async updateUser(
    userId: string,
    data: Partial<User>,
  ): Promise<UserDocument | undefined> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, data, { new: true })
      .exec();
    return user || undefined;
  }

  async updateStaff(
    staffId: string,
    data: Partial<Staff>,
  ): Promise<StaffDocument | undefined> {
    const staff = await this.staffModel
      .findByIdAndUpdate(staffId, data, { new: true })
      .exec();
    return staff || undefined;
  }

  async approveStaff(
    staffId: string,
    approvedBy: Types.ObjectId,
  ): Promise<StaffDocument | undefined> {
    const staff = await this.staffModel
      .findByIdAndUpdate(
        staffId,
        {
          is_approved: true,
          is_active: true,
          date_approved: new Date(),
          approved_by: approvedBy,
        },
        { new: true },
      )
      .exec();

    if (staff) {
      // Also update user status to active
      await this.userModel.findByIdAndUpdate(staff.user_id, {
        status: 'active',
      });
    }

    return staff || undefined;
  }

  async deactivateStaff(
    staffId: string,
    reason: string,
  ): Promise<StaffDocument | undefined> {
    const staff = await this.staffModel
      .findByIdAndUpdate(
        staffId,
        {
          is_active: false,
          deactivation_reason: reason,
          deactivated_at: new Date(),
        },
        { new: true },
      )
      .exec();

    if (staff) {
      // Also update user status to suspended
      await this.userModel.findByIdAndUpdate(staff.user_id, {
        status: 'suspended',
      });
    }

    return staff || undefined;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async findStaffById(
    staffId: string,
  ): Promise<{ user: UserDocument; staff: StaffDocument } | undefined> {
    const staff = await this.staffModel.findById(staffId).exec();
    if (!staff) {
      return undefined;
    }

    const user = await this.userModel.findById(staff.user_id).exec();
    if (!user) {
      return undefined;
    }

    return { user, staff };
  }

  async findAllStaff(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
    department?: string;
    is_approved?: boolean;
  }): Promise<{
    staff: Array<{ user: UserDocument; staff: StaffDocument }>;
    total: number;
  }> {
    const { page, limit, search, status, role, department, is_approved } =
      options;
    const skip = (page - 1) * limit;

    // Build query for staff
    const staffQuery: any = {};

    if (role) {
      staffQuery.role = role;
    }

    if (department) {
      staffQuery.department = department;
    }

    if (is_approved !== undefined) {
      staffQuery.is_approved = is_approved;
    }

    if (search) {
      staffQuery.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } },
      ];
    }

    // Get all staff matching criteria
    const staffList = await this.staffModel
      .find(staffQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.staffModel.countDocuments(staffQuery).exec();

    // Get corresponding users
    const userQuery: any = { user_type: 'staff' };
    if (status) {
      userQuery.status = status;
    }

    const staffWithUsers = await Promise.all(
      staffList.map(async (staff) => {
        const user = await this.userModel
          .findOne({
            _id: staff.user_id,
            ...userQuery,
          })
          .exec();

        if (user) {
          return { user, staff };
        }
        return null;
      }),
    );

    // Filter out null values
    const filteredStaff = staffWithUsers.filter(
      (item) => item !== null,
    ) as Array<{
      user: UserDocument;
      staff: StaffDocument;
    }>;

    return { staff: filteredStaff, total };
  }

  /**
   * Generate unique employee ID
   * Format: EMP-YYYYMMDD-XXXX (e.g., EMP-20231213-0001)
   */
  private generateEmployeeId(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `EMP-${year}${month}${day}-${random}`;
  }

  /**
   * Update staff pension contributions
   * Adds to the cumulative pension_contributions field
   *
   * @param staffId - Staff ID
   * @param amount - Pension contribution amount in kobo
   * @returns Updated staff document
   */
  async updateStaffPensionContributions(
    staffId: string | Types.ObjectId,
    amount: number,
  ): Promise<StaffDocument | undefined> {
    const staff = await this.staffModel
      .findByIdAndUpdate(
        staffId,
        { $inc: { pension_contributions: amount } },
        { new: true },
      )
      .exec();

    return staff || undefined;
  }
}
