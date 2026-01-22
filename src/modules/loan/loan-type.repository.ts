import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoanType, LoanTypeDocument } from '../../schemas/loan-type.schema';
import { CreateLoanTypeDto } from './dto/create-loan-type.dto';

@Injectable()
export class LoanTypeRepository {
  private readonly logger = new Logger(LoanTypeRepository.name);

  constructor(
    @InjectModel(LoanType.name)
    private readonly loanTypeModel: Model<LoanTypeDocument>,
  ) {}

  /**
   * Create a new loan type
   */
  async create(createDto: CreateLoanTypeDto): Promise<LoanTypeDocument> {
    this.logger.log(`Creating loan type: ${createDto.name}`);

    const loanType = new this.loanTypeModel(createDto);
    return loanType.save();
  }

  /**
   * Find loan type by ID
   */
  async findById(id: string): Promise<LoanTypeDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.loanTypeModel.findById(id).exec();
  }

  /**
   * Find loan type by name
   */
  async findByName(name: string): Promise<LoanTypeDocument | null> {
    return this.loanTypeModel.findOne({ name }).exec();
  }

  /**
   * Find all loan types with filters
   */
  async findAll(filters: {
    category?: string;
    is_active?: boolean;
    user_type?: string;
  }): Promise<LoanTypeDocument[]> {
    const query: any = {};

    if (filters.user_type) {
      query.user_type = filters.user_type;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.is_active !== undefined) {
      query.is_active = filters.is_active;
    }

    return this.loanTypeModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Update loan type
   */
  async update(
    id: string,
    updateData: Partial<LoanTypeDocument>,
  ): Promise<LoanTypeDocument | null> {
    return this.loanTypeModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  /**
   * Delete loan type
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.loanTypeModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Increment times_issued counter
   */
  async incrementTimesIssued(id: string): Promise<void> {
    await this.loanTypeModel
      .findByIdAndUpdate(id, { $inc: { times_issued: 1 } })
      .exec();
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<LoanTypeDocument | null> {
    const loanType = await this.findById(id);
    if (!loanType) {
      return null;
    }

    loanType.is_active = !loanType.is_active;
    return loanType.save();
  }
}
