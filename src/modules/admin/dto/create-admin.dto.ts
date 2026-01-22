import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support',
  VERIFIER = 'verifier',
  FINANCE = 'finance',
}

export class CreateAdminDto {
  @ApiProperty({
    example: 'admin@farmconnect.com',
    description: 'Admin email address (used for login)',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description:
      'Admin password (min 8 chars, must contain uppercase, lowercase, and number)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'Admin first name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Admin last name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    enum: AdminRole,
    example: AdminRole.SUPPORT,
    description: 'Admin role defining access level',
  })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiProperty({
    example: ['manage_users', 'view_reports'],
    description: 'Array of specific permissions granted to admin',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the admin who created this account',
    required: false,
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
