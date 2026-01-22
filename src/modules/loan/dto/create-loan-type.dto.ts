import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LoanCategory {
  INPUT_CREDIT = 'input_credit',
  FARM_TOOLS = 'farm_tools',
  EQUIPMENT = 'equipment',
  PERSONAL_LOAN = 'personal_loan',
  EMERGENCY_LOAN = 'emergency_loan',
}

export enum LoanUserType {
  FARMER = 'farmer',
  STAFF = 'staff',
}

export class CreateLoanTypeDto {
  @ApiProperty({
    description: 'Name of the loan type',
    example: 'Input Credit',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the loan type',
    example: 'Loan for farm inputs like fertilizer and cassava stems',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Type of user this loan is for',
    enum: LoanUserType,
    example: LoanUserType.FARMER,
  })
  @IsEnum(LoanUserType, {
    message: `user_type must be one of the following values: ${Object.values(LoanUserType).join(', ')}`,
  })
  user_type: LoanUserType;

  @ApiProperty({
    description: 'Loan category',
    enum: LoanCategory,
    example: LoanCategory.INPUT_CREDIT,
  })
  @IsEnum(LoanCategory, {
    message: `category must be one of the following values: ${Object.values(LoanCategory).join(', ')}`,
  })
  category: LoanCategory;

  @ApiProperty({
    description: 'Interest rate percentage',
    example: 10,
    minimum: 0,
    maximum: 30,
  })
  @IsNumber()
  @Min(0)
  @Max(30)
  interest_rate: number;

  @ApiProperty({
    description: 'Loan duration in months',
    enum: [3, 6, 9, 12],
    example: 6,
  })
  @IsEnum([3, 6, 9, 12])
  duration_months: number;
}

export class UpdateLoanTypeDto {
  @ApiPropertyOptional({ description: 'Description of the loan type' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Interest rate percentage',
    minimum: 0,
    maximum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  interest_rate?: number;

  @ApiPropertyOptional({
    description: 'Loan duration in months',
    enum: [3, 6, 9, 12],
  })
  @IsOptional()
  @IsEnum([3, 6, 9, 12])
  duration_months?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  is_active?: boolean;
}
