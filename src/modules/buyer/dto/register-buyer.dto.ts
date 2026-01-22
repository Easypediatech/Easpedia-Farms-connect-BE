import {
  IsString,
  IsNotEmpty,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BuyerTypeEnum {
  PROCESSOR = 'processor',
  AGGREGATOR = 'aggregator',
  TRADER = 'trader',
  EXPORTER = 'exporter',
}

export class RegisterBuyerDto {
  @ApiProperty({
    description: 'Phone number without country code',
    example: '8012345678',
    pattern: '^[0-9]{10}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be 10 digits' })
  phone: string;

  @ApiProperty({
    description: '4-digit PIN for authentication',
    example: '1234',
    pattern: '^[0-9]{4}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiProperty({
    description: 'First name of the buyer',
    example: 'Amina',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the buyer',
    example: 'Ibrahim',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Business name',
    example: 'Amina Foods Processing Ltd',
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    description: 'Nigerian state',
    example: 'Kano',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Nassarawa',
  })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({
    description: 'Type of buyer',
    enum: BuyerTypeEnum,
    example: BuyerTypeEnum.PROCESSOR,
  })
  @IsEnum(BuyerTypeEnum)
  @IsNotEmpty()
  buyerType: BuyerTypeEnum;
}
