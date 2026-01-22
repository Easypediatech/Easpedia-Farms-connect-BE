import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'admin@farmconnect.com',
    description: 'Admin email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'John',
    description: 'Admin first name',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Admin last name',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    example: '+2348123456789',
    description: 'Admin phone number (Nigerian number)',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  phone?: string;
}
