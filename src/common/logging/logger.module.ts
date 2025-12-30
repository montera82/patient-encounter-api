import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { LoggerService } from './logger.service';
import { RequestContextService } from './request-context.service';
import { RequestIdInterceptor } from './request-id.interceptor';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const logLevel = configService.get('LOG_LEVEL') || 'info';

        const format = winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
        );

        const transports: winston.transport[] = [new winston.transports.Console({ format })];

        if (isProduction) {
          transports.push(
            new winston.transports.File({
              filename: 'logs/app.log',
              format,
              maxsize: 5242880,
              maxFiles: 5,
            })
          );
        }

        return {
          level: logLevel,
          format,
          transports,
          silent: false,
        };
      },
    }),
  ],
  providers: [
    LoggerService,
    RequestContextService,
    RequestIdInterceptor,
  ],
  exports: [
    WinstonModule,
    LoggerService,
    RequestContextService,
    RequestIdInterceptor,
  ],
})
@Global()
export class LoggerModule {}
