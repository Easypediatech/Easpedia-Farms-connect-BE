import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ProductResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    productName: string;

    @ApiProperty({ description: 'Price in Naira (converted from kobo)' })
    @Transform(({ value }) => value / 100) // Convert from kobo to Naira
    priceForFarmers: number;

    @ApiProperty({ description: 'Price in Naira (converted from kobo)' })
    @Transform(({ value }) => value / 100) // Convert from kobo to Naira
    priceForMarket: number;

    @ApiProperty()
    size: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
