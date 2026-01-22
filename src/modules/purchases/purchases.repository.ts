import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Purchase, PurchaseDocument } from '../../schemas/purchase.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesRepository {
  constructor(
    @InjectModel(Purchase.name) 
    private readonly purchaseModel: Model<Purchase>,
  ) {}

  async create(createPurchaseData: any, recordedById: string): Promise<PurchaseDocument> {
    const purchase = new this.purchaseModel({
      ...createPurchaseData,
      status: 'pending',
      paymentStatus: 'pending',
      recordedById,
      recordedBy: 'admin',
    });

    return purchase.save();
  }

  async findAll(filter: FilterQuery<Purchase> = {}, skip = 0, limit = 20): Promise<Purchase[]> {
    return this.purchaseModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<Purchase | null> {
    return this.purchaseModel.findById(id).exec();
  }

  async updateStatus(id: string, status: string): Promise<Purchase | null> {
    return this.purchaseModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async updatePaymentStatus(id: string, paymentStatus: string): Promise<Purchase | null> {
    return this.purchaseModel
      .findByIdAndUpdate(id, { paymentStatus }, { new: true })
      .exec();
  }

  async count(filter: FilterQuery<Purchase> = {}): Promise<number> {
    return this.purchaseModel.countDocuments(filter);
  }

  async updateTransactionReferences(
    id: string,
    references: {
      walletTransactionId?: string;
      loanDeductionAmount?: number;
      loanDeductionTransactionId?: string;
      savingsDeductionAmount?: number;
      savingsTransactionId?: string;
      netAmountCredited?: number;
    },
  ): Promise<Purchase | null> {
    return this.purchaseModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(references.walletTransactionId && { walletTransactionId: references.walletTransactionId }),
            ...(references.loanDeductionAmount !== undefined && { loanDeductionAmount: references.loanDeductionAmount }),
            ...(references.loanDeductionTransactionId && { loanDeductionTransactionId: references.loanDeductionTransactionId }),
            ...(references.savingsDeductionAmount !== undefined && { savingsDeductionAmount: references.savingsDeductionAmount }),
            ...(references.savingsTransactionId && { savingsTransactionId: references.savingsTransactionId }),
            ...(references.netAmountCredited !== undefined && { netAmountCredited: references.netAmountCredited }),
          },
        },
        { new: true }
      )
      .exec();
  }

  async getTotalAmountSpent(): Promise<number> {
    const result = await this.purchaseModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  async getTotalWeight(): Promise<number> {
    const result = await this.purchaseModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$weightKg' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  async getAveragePrice(): Promise<number> {
    const result = await this.purchaseModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgPrice: { $avg: '$pricePerKg' } } }
    ]);
    return result.length > 0 ? result[0].avgPrice : 0;
  }

}