import { PipeTransform, Injectable, HttpStatus } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './app-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) { // eslint-disable-line
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw error;
      }

      throw new AppError('Invalid input data', HttpStatus.BAD_REQUEST, 'Validation failed', {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function createZodPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}
