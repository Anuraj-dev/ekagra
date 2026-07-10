import { type ApiErrorBody, type ApiErrorCode, ContractError } from '../_vendor/core/index.ts';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiFailure = ApiError;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function failure(error: unknown): Response {
  const apiError =
    error instanceof ApiError
      ? error
      : error instanceof ContractError
        ? new ApiError('bad_request', error.message)
        : new ApiError('internal_error', 'Unexpected server error.');
  const body: ApiErrorBody = {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    },
  };
  const status =
    apiError.code === 'bad_request'
      ? 400
      : apiError.code === 'unauthorized'
        ? 401
        : apiError.code === 'forbidden'
          ? 403
          : apiError.code === 'not_found'
            ? 404
            : apiError.code === 'conflict'
              ? 409
              : 500;
  return json(body, status);
}

export async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('bad_request', 'Request body must be valid JSON.');
  }
}

export function method(request: Request, allowed: string[]): void {
  if (!allowed.includes(request.method)) {
    throw new ApiError('bad_request', `Method ${request.method} is not supported.`);
  }
}
