import { IsString, IsUrl } from 'class-validator';

export class AddNinDto {
  @IsString()
  @IsUrl({}, { message: 'NIN must be a valid URL' })
  nin: string;
}
