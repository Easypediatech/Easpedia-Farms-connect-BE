import { IsString, IsNotEmpty, IsNumber, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterFarmerDto {
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
    description: 'First name of the farmer',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the farmer',
    example: 'Okafor',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Nigerian state',
    example: 'Lagos',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Ikeja',
  })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({
    description: 'Farm size in hectares',
    example: 2.5,
    minimum: 0.1,
  })
  @IsNumber()
  @Min(0.1, { message: 'Farm size must be at least 0.1 hectares' })
  farmSize: number;
}
