import { UnauthorizedException } from '@nestjs/common';

export class InvalidPinException extends UnauthorizedException {
  constructor() {
    super('Invalid phone number or PIN');
  }
}
