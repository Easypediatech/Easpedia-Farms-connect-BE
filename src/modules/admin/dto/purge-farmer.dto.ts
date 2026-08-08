import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** Requires the caller to explicitly opt into an irreversible delete. */
export class PurgeFarmerQueryDto {
  @ApiProperty({ enum: ['DELETE'], description: 'Must be the literal string DELETE to confirm.' })
  @IsIn(['DELETE'])
  confirmation: 'DELETE';
}
