import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Farmer, FarmerDocument } from '../../schemas/farmer.schema';
import { RegisterFarmerDto } from './dto/register-farmer.dto';

export interface IFarmerRepository {
  findUserByPhone(phone: string): Promise<UserDocument | undefined>;
  findFarmerByUserId(userId: string): Promise<FarmerDocument | undefined>;
  findFarmerById(farmerId: string): Promise<{ user: UserDocument; farmer: FarmerDocument } | undefined>;
  findAllFarmers(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    lga?: string;
  }): Promise<{ farmers: Array<{ user: UserDocument; farmer: FarmerDocument, wallet: any }>; total: number }>;
  createFarmer(
    registerDto: RegisterFarmerDto,
  ): Promise<{ user: UserDocument; farmer: FarmerDocument }>;
  updateUser(userId: string, data: Partial<User>): Promise<UserDocument | undefined>;
  updateFarmer(
    farmerId: string,
    data: Partial<Farmer>,
  ): Promise<FarmerDocument | undefined>;
  deleteUser(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

@Injectable()
export class FarmerRepository implements IFarmerRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
  ) {}

  async findUserByPhone(phone: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findOne({ phone }).exec();
    return user || undefined;
  }

  async findFarmerByUserId(userId: string): Promise<FarmerDocument | undefined> {
    const farmer = await this.farmerModel
      .findOne({ user_id: userId })
      .exec();
    return farmer || undefined;
  }

  async createFarmer(
    registerDto: RegisterFarmerDto,
  ): Promise<{ user: UserDocument; farmer: FarmerDocument }> {
    // Create user with hashed PIN (pre-save hook will hash it)
    const userData = {
      phone: registerDto.phone,
      phone_code: '234',
      password: registerDto.pin, // Will be hashed by pre-save hook
      user_type: 'farmer',
      ussd_stage: 'menu',
      status: 'active',
    };

    const user = await this.userModel.create(userData);

    // Create farmer profile
    const farmerData = {
      user_id: user._id,
      first_name: registerDto.firstName,
      last_name: registerDto.lastName,
      lga: registerDto.lga,
      farm_size_hectares: registerDto.farmSize,
    };

    const farmer = await this.farmerModel.create(farmerData);

    // Update user with farmer_profile_id
    await this.userModel.findByIdAndUpdate(user._id, {
      farmer_profile_id: farmer._id,
    });

    return { user, farmer };
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

  async updateFarmer(
    farmerId: string,
    data: Partial<Farmer>,
  ): Promise<FarmerDocument | undefined> {
    const farmer = await this.farmerModel
      .findByIdAndUpdate(farmerId, data, { new: true })
      .exec();
    return farmer || undefined;
  }

  async updateFarmerRaw(
    farmerId: string,
    data: any,
  ): Promise<FarmerDocument | undefined> {
    const farmer = await this.farmerModel
      .findByIdAndUpdate(farmerId, data, { new: true })
      .exec();
    return farmer || undefined;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async findFarmerById(
    farmerId: string,
  ): Promise<{ user: UserDocument; farmer: FarmerDocument } | undefined> {
    const farmer = await this.farmerModel.findById(farmerId).exec();
    if (!farmer) {
      return undefined;
    }

    const user = await this.userModel.findById(farmer.user_id).exec();
    if (!user) {
      return undefined;
    }

    return { user, farmer };
  }

  async findAllFarmers(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    lga?: string;
  }): Promise<{
    farmers: Array<{ user: UserDocument; farmer: FarmerDocument; wallet: any }>;
    total: number;
  }> {
    const { page, limit, search, status, lga } = options;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [];

    // Match farmers based on farmer criteria
    const farmerMatch: any = {};
    if (lga) {
      farmerMatch.lga = { $regex: lga, $options: 'i' };
    }
    if (search) {
      farmerMatch.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
      ];
    }
    if (Object.keys(farmerMatch).length > 0) {
      pipeline.push({ $match: farmerMatch });
    }

    // Join with users collection
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    });

    // Unwind the user array
    pipeline.push({ $unwind: '$user' });

    // Match based on user criteria
    const userMatch: any = { 'user.user_type': 'farmer' };
    if (status) {
      userMatch['user.status'] = status;
    }
    if (search) {
      userMatch['user.phone'] = { $regex: search, $options: 'i' };
    }
    pipeline.push({ $match: userMatch });

    // Join with wallets collection
    pipeline.push({
      $lookup: {
        from: 'wallets',
        localField: 'user_id',
        foreignField: 'user_id',
        as: 'wallet',
      },
    });

    // Unwind the wallet array, preserving farmers without a wallet
    pipeline.push({ $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } });

    // Main pipeline for fetching farmers
    const farmersPipeline = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          farmer: '$$ROOT',
          user: '$user',
          wallet: '$wallet',
        },
      },
    ];

    // Count pipeline for total documents
    const countPipeline = [...pipeline, { $count: 'total' }];

    const [farmersResult, countResult] = await Promise.all([
      this.farmerModel.aggregate(farmersPipeline).exec(),
      this.farmerModel.aggregate(countPipeline).exec(),
    ]);

    const result = farmersResult.map((item) => ({
      farmer: new this.farmerModel(item.farmer),
      user: new this.userModel(item.user),
      wallet: item.wallet,
    }));

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return { farmers: result, total };
  }
}
