import {
  IsPhoneNumber,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class LoginStaffDto {
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
