import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductRepository {
    constructor(
        @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    ) { }

    async create(createDto: CreateProductDto): Promise<Product> {
        // Check if product name already exists
        const existingProduct = await this.productModel.findOne({
            product_name: { $regex: `^${createDto.productName}$`, $options: 'i' }
        }).lean().exec();

        if (existingProduct) {
            throw new Error(`Product with name "${createDto.productName}" already exists`);
        }

        const data: any = {
            product_name: createDto.productName,
            price_for_farmers: createDto.priceForFarmers * 100, // Convert naira to kobo
            price_for_market: createDto.priceForMarket * 100, // Convert naira to kobo
            size: createDto.size,
            created_by: createDto.createdBy,
        };
        const product = new this.productModel(data);
        return product.save();
    }

    async findById(id: string): Promise<Product | undefined> {
        const p = await this.productModel.findById(id).lean().exec();
        return p ?? undefined;
    }

    async findAll(): Promise<Product[]> {
        return this.productModel.find().lean().exec();
    }

    async findWithPagination(filters: GetProductsDto): Promise<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 20, search, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

        // Build query
        const query: any = {};

        if (search) {
            query.product_name = { $regex: search, $options: 'i' };
        }

        if (isActive !== undefined) {
            query.is_active = isActive === 'true';
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute queries
        const [products, total] = await Promise.all([
            this.productModel
                .find(query)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            this.productModel.countDocuments(query).exec(),
        ]);

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, updateDto: UpdateProductDto): Promise<Product | undefined> {
        // Check if updating product name and if it conflicts with existing products
        if (updateDto.productName) {
            const existingProduct = await this.productModel.findOne({
                _id: { $ne: id },
                product_name: { $regex: `^${updateDto.productName}$`, $options: 'i' }
            }).lean().exec();

            if (existingProduct) {
                throw new BadRequestException(`Product with name "${updateDto.productName}" already exists`);
            }
        }

        const update: any = {};
        if (updateDto.productName !== undefined) update.product_name = updateDto.productName;
        if (updateDto.priceForFarmers !== undefined) update.price_for_farmers = updateDto.priceForFarmers * 100; // Convert naira to kobo
        if (updateDto.priceForMarket !== undefined) update.price_for_market = updateDto.priceForMarket * 100; // Convert naira to kobo
        if (updateDto.size !== undefined) update.size = updateDto.size;
        if (updateDto.isActive !== undefined) update.is_active = updateDto.isActive;

        const product = await this.productModel.findByIdAndUpdate(id, update, { new: true }).lean().exec();
        return product ?? undefined;
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this.productModel.findByIdAndDelete(id).exec();
            return result !== null;
        } catch (error) {
            throw new BadRequestException(`Failed to delete product: ${error.message}`);
        }
    }
}
