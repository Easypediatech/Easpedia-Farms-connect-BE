import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude, Transform } from 'class-transformer';
import { AdminRole } from './create-admin.dto';

export class AdminResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @ApiProperty({ example: 'admin@farmconnect.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'John' })
  @Expose()
  @Transform(({ obj }) => obj.first_name)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  @Transform(({ obj }) => obj.last_name)
  lastName: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  @Transform(({ obj }) => obj.full_name ?? `${obj.first_name} ${obj.last_name}`)
  fullName: string;

  @ApiProperty({ example: '+2348123456789', required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.SUPPORT })
  @Expose()
  role: AdminRole;

  @ApiProperty({ example: ['manage_users', 'view_reports'] })
  @Expose()
  permissions: string[];

  @ApiProperty({ example: true })
  @Expose()
  @Transform(({ obj }) => obj.is_active)
  isActive: boolean;

  @ApiProperty({ example: '2025-11-24T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-11-24T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ example: '507f1f77bcf86cd799439010', required: false })
  @Expose()
  @Transform(({ obj }) => obj.created_by?.toString())
  createdBy?: string;

  // Exclude sensitive fields
  @Exclude()
  password?: string;

  @Exclude()
  __v?: number;
}
