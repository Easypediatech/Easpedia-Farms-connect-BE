import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActivateAdminDto {
  @ApiProperty({
    example: 'Admin account reactivated due to business requirements',
    description: 'Reason for activating/deactivating the admin account',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DeactivateAdminDto extends ActivateAdminDto {
  // Same structure, just different semantic meaning
}
