import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  @Expose()
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 86400,
  })
  @Expose()
  expiresIn: number;

  @ApiProperty({
    description: 'Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  adminId: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@farmconnect.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Admin role',
    example: 'super_admin',
  })
  @Expose()
  role: string;
}
