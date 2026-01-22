import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Buyer, BuyerDocument } from '../../schemas/buyer.schema';
import { RegisterBuyerDto } from './dto/register-buyer.dto';

export interface IBuyerRepository {
  findUserByPhone(phone: string): Promise<UserDocument | undefined>;
  findBuyerByUserId(userId: string): Promise<BuyerDocument | undefined>;
  createBuyer(
    registerDto: RegisterBuyerDto,
  ): Promise<{ user: UserDocument; buyer: BuyerDocument }>;
  updateUser(userId: string, data: Partial<User>): Promise<UserDocument | undefined>;
  updateBuyer(
    buyerId: string,
    data: Partial<Buyer>,
  ): Promise<BuyerDocument | undefined>;
}

@Injectable()
export class BuyerRepository implements IBuyerRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Buyer.name) private readonly buyerModel: Model<BuyerDocument>,
  ) {}

  async findUserByPhone(phone: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findOne({ phone }).exec();
    return user || undefined;
  }

  async findBuyerByUserId(userId: string): Promise<BuyerDocument | undefined> {
    const buyer = await this.buyerModel
      .findOne({ user_id: userId })
      .exec();
    return buyer || undefined;
  }

  async createBuyer(
    registerDto: RegisterBuyerDto,
  ): Promise<{ user: UserDocument; buyer: BuyerDocument }> {
    // Create user with hashed PIN (pre-save hook will hash it)
    const userData = {
      phone: registerDto.phone,
      phone_code: '234',
      password: registerDto.pin, // Will be hashed by pre-save hook
      user_type: 'buyer',
      ussd_stage: 'menu',
      status: 'active',
    };

    const user = await this.userModel.create(userData);

    // Create buyer profile
    const buyerData = {
      user_id: user._id,
      first_name: registerDto.firstName,
      last_name: registerDto.lastName,
      business_name: registerDto.businessName,
      lga: registerDto.lga,
      buyer_type: registerDto.buyerType,
    };

    const buyer = await this.buyerModel.create(buyerData);

    // Update user with buyer_profile_id
    await this.userModel.findByIdAndUpdate(user._id, {
      buyer_profile_id: buyer._id,
    });

    return { user, buyer };
  }

  async updateUser(
    userId: string,
    data: Partial<User>,
  ): Promise<UserDocument | undefined> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, data, { new: true })
      .exec();
    return user ?? undefined;
  }

  async updateBuyer(
    buyerId: string,
    data: Partial<Buyer>,
  ): Promise<BuyerDocument | undefined> {
    const buyer = await this.buyerModel
      .findByIdAndUpdate(buyerId, data, { new: true })
      .exec();
    return buyer ?? undefined;
  }
}
