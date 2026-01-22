import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DojahService } from './dojah.service';

@Module({
  imports: [ConfigModule],
  providers: [DojahService],
  exports: [DojahService],
})
export class DojahModule {}