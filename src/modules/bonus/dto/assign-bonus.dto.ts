import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { StaffBonusDto } from './staff-bonus.dto';

export class AssignBonusDto {
  @ApiProperty({
    description: 'Array of staff bonuses to assign',
    type: [StaffBonusDto],
    example: [
      {
        staffId: '507f1f77bcf86cd799439011',
        amount: 5000,
        reason: 'Performance bonus'
      },
      {
        staffId: '507f1f77bcf86cd799439012',
        amount: 3000,
        reason: 'Project completion bonus'
      }
    ],
  })
  @IsNotEmpty({ message: 'Staff bonuses array is required' })
  @IsArray({ message: 'Staff bonuses must be an array' })
  @ArrayNotEmpty({ message: 'At least one staff bonus is required' })
  @ValidateNested({ each: true })
  @Type(() => StaffBonusDto)
  staffBonuses: StaffBonusDto[];
}