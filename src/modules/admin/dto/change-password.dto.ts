import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123',
    description: 'Current password',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassword123',
    description:
      'New password (min 8 chars, must contain uppercase, lowercase, and number)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
