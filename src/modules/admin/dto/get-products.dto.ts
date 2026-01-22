import { IsOptional, IsString, IsNumberString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetProductsDto {
    @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
    @IsOptional()
    @IsNumberString({}, { message: 'Page must be a valid number' })
    @Transform(({ value }) => parseInt(value, 10))
    page?: number = 1;

    @ApiPropertyOptional({ example: 20, description: 'Items per page (default: 20, max: 100)' })
    @IsOptional()
    @IsNumberString({}, { message: 'Limit must be a valid number' })
    @Transform(({ value }) => Math.min(parseInt(value, 10), 100))
    limit?: number = 20;

    @ApiPropertyOptional({ example: 'cassava', description: 'Search by product name' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 'true', description: 'Filter by active status' })
    @IsOptional()
    @IsIn(['true', 'false'])
    isActive?: string;

    @ApiPropertyOptional({
        example: 'createdAt',
        description: 'Sort field',
        enum: ['createdAt', 'product_name', 'price_for_farmers', 'price_for_market']
    })
    @IsOptional()
    @IsIn(['createdAt', 'product_name', 'price_for_farmers', 'price_for_market'])
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        example: 'desc',
        description: 'Sort order',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: string = 'desc';
}