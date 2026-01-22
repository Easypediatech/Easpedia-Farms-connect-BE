import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({
    example: 'admin@farmconnect.com',
    description: 'Admin email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'Admin password',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
