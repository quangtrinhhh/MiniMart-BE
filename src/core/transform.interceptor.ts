import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from 'src/decorator/customize';

export interface ApiResponse<T, M = undefined> {
  statusCode: number;
  message?: string;
  data: T;
  meta?: M;
}

type MaybeWithMeta<T, M> = T | { data: T; meta: M };

@Injectable()
export class TransformInterceptor<T, M = undefined>
  implements NestInterceptor<MaybeWithMeta<T, M>, ApiResponse<T, M>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T, M>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) || '';

    return next
      .handle()
      .pipe(
        map((result: MaybeWithMeta<T, M>) =>
          this.transformResponse(result, response.statusCode, message),
        ),
      );
  }

  private transformResponse(
    result: MaybeWithMeta<T, M>,
    statusCode: number,
    message: string,
  ): ApiResponse<T, M> {
    if (
      typeof result === 'object' &&
      result !== null &&
      'data' in result &&
      'meta' in result
    ) {
      const { data, meta } = result as { data: T; meta: M };
      return { statusCode, message, data, meta };
    }

    return {
      statusCode,
      message,
      data: result,
    };
  }
}
