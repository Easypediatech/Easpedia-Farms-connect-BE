import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production' ? ['error', 'warn'] : undefined,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // Only enable Swagger in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FarmConnect API')
      .setDescription('USSD Cassava Marketplace Backend API')
      .setVersion('1.0')
      .addTag('Admin', 'Admin management endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

    // Enable CORS
    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:4200',
            'https://farmconnect-backend-wsez.onrender.com',
            'https://cassava-management-ussd-system-eight.vercel.app',
            'https://admin.promisepointgtnl.com',
        ],
        credentials: true,
    });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  } else {
    console.log(`Application started on port ${port}`);
  }
}
void bootstrap();
