import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from '../../schemas/admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { IAdminRepository } from './interfaces/admin-repository.interface';

@Injectable()
export class AdminRepository implements IAdminRepository {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
  ) {}

  async findById(id: string): Promise<Admin | undefined> {
    const admin = await this.adminModel.findById(id).lean().exec();
    return admin ?? undefined;
  }

  async findByEmail(email: string): Promise<Admin | undefined> {
    const admin = await this.adminModel.findOne({ email }).lean().exec();
    return admin ?? undefined;
  }

  async findByPhone(phone: string): Promise<Admin | undefined> {
    const admin = await this.adminModel.findOne({ phone }).lean().exec();
    return admin ?? undefined;
  }

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    // Transform camelCase to snake_case for MongoDB
    const adminData = {
      email: createAdminDto.email,
      password: createAdminDto.password,
      first_name: createAdminDto.firstName,
      last_name: createAdminDto.lastName,
      role: createAdminDto.role,
      permissions: createAdminDto.permissions ?? [],
      created_by: createAdminDto.createdBy,
    };

    const admin = new this.adminModel(adminData);
    return admin.save();
  }

  async update(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<Admin | undefined> {
    // Transform camelCase to snake_case for MongoDB
    const updateData: any = {};

    if (updateAdminDto.email !== undefined) {
      updateData.email = updateAdminDto.email;
    }
    if (updateAdminDto.firstName !== undefined) {
      updateData.first_name = updateAdminDto.firstName;
    }
    if (updateAdminDto.lastName !== undefined) {
      updateData.last_name = updateAdminDto.lastName;
    }
    // Handle direct snake_case fields from service calls
    if ((updateAdminDto as any).first_name !== undefined) {
      updateData.first_name = (updateAdminDto as any).first_name;
    }
    if ((updateAdminDto as any).last_name !== undefined) {
      updateData.last_name = (updateAdminDto as any).last_name;
    }
    if (updateAdminDto.role !== undefined) {
      updateData.role = updateAdminDto.role;
    }
    if (updateAdminDto.permissions !== undefined) {
      updateData.permissions = updateAdminDto.permissions;
    }
    if ((updateAdminDto as any).phone !== undefined) {
      updateData.phone = (updateAdminDto as any).phone;
    }
    if ((updateAdminDto as any).password !== undefined) {
      updateData.password = (updateAdminDto as any).password;
    }
    if ((updateAdminDto as any).isActive !== undefined) {
      updateData.is_active = (updateAdminDto as any).isActive;
    }

    const admin = await this.adminModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean()
      .exec();
    return admin ?? undefined;
  }

  async delete(id: string): Promise<Admin | undefined> {
    const admin = await this.adminModel
      .findByIdAndUpdate(id, { is_active: false }, { new: true })
      .lean()
      .exec();
    return admin ?? undefined;
  }

  async findAll(): Promise<Admin[]> {
    return this.adminModel.find({ is_active: true }).lean().exec();
  }

  async findAllWithQuery(options: {
    query: any;
    skip: number;
    limit: number;
    sort: any;
  }): Promise<Admin[]> {
    const { query, skip, limit, sort } = options;
    return this.adminModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  async countWithQuery(query: any): Promise<number> {
    return this.adminModel.countDocuments(query).exec();
  }
}
