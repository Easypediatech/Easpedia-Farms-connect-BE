import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class RegisterStaffDto {
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'LGA is required' })
  lga: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Monthly salary must be a positive number' })
  monthlySalary?: number;

  @IsString()
  @IsNotEmpty({ message: 'PIN is required' })
  @MinLength(4, { message: 'PIN must be exactly 4 digits' })
  @MaxLength(4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
