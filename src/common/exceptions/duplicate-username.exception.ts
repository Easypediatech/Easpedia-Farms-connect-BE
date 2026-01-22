import { ConflictException } from '@nestjs/common';

export class DuplicateUsernameException extends ConflictException {
  constructor(username: string) {
    super(`Admin with username '${username}' already exists`);
  }
}
