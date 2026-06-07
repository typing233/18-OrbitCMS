import { HttpException, HttpStatus } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationException extends HttpException {
  constructor(errors: FieldError[]) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Validation failed',
        errors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
