import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateProductDto {
    @ApiProperty({ example: 'Cassava (Fresh)' })
    @IsString()
    @IsNotEmpty()
    productName: string;

    @ApiProperty({ example: 120, description: 'Price in Naira (will be converted to kobo)' })
    @IsNumber({}, { message: 'Price for farmers must be a valid number' })
    @Min(0, { message: 'Price for farmers cannot be negative' })
    @Transform(({ value }) => Math.round(value * 100)) // Convert to kobo
    priceForFarmers: number;

    @ApiProperty({ example: 150, description: 'Price in Naira (will be converted to kobo)' })
    @IsNumber({}, { message: 'Price for market must be a valid number' })
    @Min(0, { message: 'Price for market cannot be negative' })
    @Transform(({ value }) => Math.round(value * 100)) // Convert to kobo
    priceForMarket: number;

    @ApiProperty({ example: 'per 10kg' })
    @IsString()
    @IsNotEmpty()
    size: string;

    @IsOptional()
    createdBy?: string;
}
