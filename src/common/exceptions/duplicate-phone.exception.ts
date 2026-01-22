import { ConflictException } from '@nestjs/common';

export class DuplicatePhoneException extends ConflictException {
  constructor(phone: string) {
    super(`Phone number ${phone} is already registered`);
  }
}
