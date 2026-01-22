import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({
    description: 'Current 4-digit PIN',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4}$/, { message: 'Current PIN must be exactly 4 digits' })
  currentPin: string;

  @ApiProperty({
    description: 'New 4-digit PIN',
    example: '5678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4}$/, { message: 'New PIN must be exactly 4 digits' })
  newPin: string;
}
