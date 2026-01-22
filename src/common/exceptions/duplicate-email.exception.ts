import { ConflictException } from '@nestjs/common';

export class DuplicateEmailException extends ConflictException {
  constructor(email: string) {
    super(`Admin with email '${email}' already exists`);
  }
}
