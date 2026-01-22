import {
  IsPhoneNumber,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPinResetDto {
  @ApiProperty({
    description: 'Staff phone number (Nigerian number)',
    example: '+2348123456789',
  })
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  @IsNotEmpty()
  phone: string;
}

export class VerifyPinResetDto {
  @ApiProperty({
    description: 'Staff phone number',
    example: '+2348123456789',
  })
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: '6-digit OTP code received via SMS',
    example: '123456',
  })
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiProperty({
    description: 'New 4-digit PIN',
    example: '1234',
  })
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  newPin: string;
}
