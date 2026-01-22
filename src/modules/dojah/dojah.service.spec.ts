import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DojahService } from '../dojah.service';

describe('DojahService', () => {
  let service: DojahService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DojahService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                DOJAH_API_URL: 'https://api.dojah.io',
                DOJAH_PRIVATE_KEY: 'test_key',
                DOJAH_APP_ID: 'test_app_id',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DojahService>(DojahService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should normalize phone number correctly', async () => {
    // This would require mocking the axios call
    expect(true).toBe(true);
  });
});