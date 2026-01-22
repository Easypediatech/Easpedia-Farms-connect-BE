import {
  IsPhoneNumber,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Admin phone number (Nigerian number)',
    example: '+2348123456789',
  })
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  @IsNotEmpty()
  phone: string;
}

export class VerifyPasswordResetDto {
  @ApiProperty({
    description: 'Admin phone number',
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
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePass123',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}
