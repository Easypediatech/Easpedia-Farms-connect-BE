import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class IntrospectResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid and active',
    example: true,
  })
  @Expose()
  active: boolean;

  @ApiProperty({
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @Expose()
  adminId?: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@farmconnect.com',
    required: false,
  })
  @Expose()
  email?: string;

  @ApiProperty({
    description: 'Admin role',
    example: 'super_admin',
    required: false,
  })
  @Expose()
  role?: string;

  @ApiProperty({
    description: 'User type',
    example: 'admin',
    required: false,
  })
  @Expose()
  type?: string;

  @ApiProperty({
    description: 'Token issued at timestamp',
    example: 1638360000,
    required: false,
  })
  @Expose()
  iat?: number;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: 1638446400,
    required: false,
  })
  @Expose()
  exp?: number;
}
