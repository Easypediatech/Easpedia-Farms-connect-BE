import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class DeactivateStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  reason: string;
}
