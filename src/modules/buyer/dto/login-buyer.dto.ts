import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginBuyerDto {
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
    description: '4-digit PIN',
    example: '1234',
    pattern: '^[0-9]{4}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
