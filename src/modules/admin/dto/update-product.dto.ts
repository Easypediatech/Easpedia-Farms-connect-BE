import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
    @ApiPropertyOptional({ example: 'Cassava (Fresh)' })
    @IsOptional()
    @IsString()
    productName?: string;

    @ApiPropertyOptional({ example: 120, description: 'Price in Naira (will be converted to kobo)' })
    @IsOptional()
    @IsNumber({}, { message: 'Price for farmers must be a valid number' })
    @Min(0, { message: 'Price for farmers cannot be negative' })
    @Transform(({ value }) => value !== undefined ? Math.round(value * 100) : undefined)
    priceForFarmers?: number;

    @ApiPropertyOptional({ example: 150, description: 'Price in Naira (will be converted to kobo)' })
    @IsOptional()
    @IsNumber({}, { message: 'Price for market must be a valid number' })
    @Min(0, { message: 'Price for market cannot be negative' })
    @Transform(({ value }) => value !== undefined ? Math.round(value * 100) : undefined)
    priceForMarket?: number;

    @ApiPropertyOptional({ example: 'per 10kg' })
    @IsOptional()
    @IsString()
    size?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
