import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class LoanItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number; // kobo

  @IsNumber()
  @Min(0)
  total_price: number; // kobo

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  loanTypeId: string;

  @IsNumber()
  @Min(1)
  principalAmount: number; // kobo

  @IsNumber()
  @Min(0)
  interestRate: number; // e.g., 10 or 15

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsNumber()
  durationMonths: number; // 3 | 6 | 9 | 12

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  pickupDate?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanItemDto)
  items?: LoanItemDto[];
}
