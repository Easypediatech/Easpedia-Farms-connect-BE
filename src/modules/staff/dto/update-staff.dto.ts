import {
  IsString,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  lastName?: string;

  @IsString()
  @IsOptional()
  lga?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Monthly salary must be a positive number' })
  monthlySalary?: number;
}
