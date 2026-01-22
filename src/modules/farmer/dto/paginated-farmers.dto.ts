import { ApiProperty } from '@nestjs/swagger';
import { FarmerResponseDto } from './farmer-response.dto';

export class PaginatedFarmersDto {
  @ApiProperty({ type: [FarmerResponseDto] })
  data: FarmerResponseDto[];

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total items' })
  total: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}
