import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    app.use(compression());
  
    app.use(
      rateLimit({
        windowMs: (configService.get('RATE_LIMIT_TTL') || 60) * 1000,
        max: configService.get('RATE_LIMIT_LIMIT') || 100,
        message: {
          error: 'Too many requests from this IP, please try again later.',
          statusCode: 429,
        },
        standardHeaders: true,
        legacyHeaders: false,
      })
    );

    const corsOrigins = configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'];
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
      credentials: true,
    });

    const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: configService.get('NODE_ENV') === 'production',
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    if (configService.get('NODE_ENV') !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Patient Encounter API')
        .setDescription('HIPAA-compliant patient encounter management')
        .setVersion('1.0')
        .addTag('encounters', 'Patient encounter management')
        .addTag('audit', 'Audit trail and compliance')
        .addTag('auth', 'Authentication and authorization')
        .addApiKey(
          {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key for authentication',
          },
          'api-key'
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      logger.log(
        `Swagger documentation available at: http://localhost:${configService.get('PORT') || 3000}/${apiPrefix}/docs`
      );
    }

    const port = configService.get('PORT') || 3000;
    await app.listen(port);

    logger.log(`Patient Encounter API is running on port ${port}`);
    logger.log(`Environment: ${configService.get('NODE_ENV')}`);
    logger.log(`API Prefix: /${apiPrefix}`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
