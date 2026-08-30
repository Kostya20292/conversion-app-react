import {
  apiErrorCodeFromStatus,
  isApiErrorCode,
  mapApiErrorCode,
  mapNetworkError,
} from './mapApiErrorCode';
import { triggerBrowserDownload } from '@/lib/triggerBrowserDownload';
import type { ApiErrorCode, ApiErrorContext } from '@/types/api';

export type HttpErrorHandlers = {
  onSessionExpired?: () => void;
  onRateLimited?: (retryAfterSeconds?: number) => void;
  onServerError?: () => void;
  onNetworkError?: () => void;
};

export type ApiFetchNotify = {
  sessionExpired?: boolean;
  rateLimited?: boolean;
  serverError?: boolean;
  network?: boolean;
};

export type ApiFetchOptions = RequestInit & {
  errorContext?: ApiErrorContext;
  notify?: ApiFetchNotify;
};

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly retryAfterSeconds?: number;

  constructor(input: {
    code: ApiErrorCode;
    status: number;
    userMessage: string;
    retryAfterSeconds?: number;
  }) {
    super(input.userMessage);
    this.name = 'ApiRequestError';
    this.code = input.code;
    this.status = input.status;
    this.userMessage = input.userMessage;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

export class NetworkError extends Error {
  readonly userMessage: string;

  constructor() {
    const userMessage = mapNetworkError();
    super(userMessage);
    this.name = 'NetworkError';
    this.userMessage = userMessage;
  }
}

let httpErrorHandlers: HttpErrorHandlers = {};

export const setHttpErrorHandlers = (handlers: HttpErrorHandlers): void => {
  httpErrorHandlers = handlers;
};

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

const parseRetryAfterSeconds = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const asInt = Number.parseInt(trimmed, 10);
  if (String(asInt) === trimmed && asInt >= 0) {
    return asInt;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return undefined;
  }

  return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
};

const readApiError = async (
  response: Response,
): Promise<{ code: ApiErrorCode; message?: string; retryAfterSeconds?: number }> => {
  const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'));

  try {
    const body = (await response.json()) as { error?: { code?: unknown; message?: unknown } };
    const rawCode = body.error?.code;
    const code =
      typeof rawCode === 'string' && isApiErrorCode(rawCode)
        ? rawCode
        : apiErrorCodeFromStatus(response.status);
    const message = typeof body.error?.message === 'string' ? body.error.message : undefined;

    return { code, message, retryAfterSeconds };
  } catch {
    return { code: apiErrorCodeFromStatus(response.status), retryAfterSeconds };
  }
};

const notifyError = (error: ApiRequestError, notify: ApiFetchNotify | undefined): void => {
  if (error.status >= 500 && notify?.serverError !== false) {
    httpErrorHandlers.onServerError?.();
  }

  if (error.code === 'rate_limited' && notify?.rateLimited !== false) {
    httpErrorHandlers.onRateLimited?.(error.retryAfterSeconds);
  }

  if (error.code === 'unauthorized' && notify?.sessionExpired === true && error.status === 401) {
    httpErrorHandlers.onSessionExpired?.();
  }
};

const notifyNetworkError = (notify: ApiFetchNotify | undefined): void => {
  if (notify?.network !== false) {
    httpErrorHandlers.onNetworkError?.();
  }
};

const filenameFromContentDisposition = (header: string | null): string | undefined => {
  if (!header) {
    return undefined;
  }

  const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (utf8Name) {
    try {
      return decodeURIComponent(utf8Name);
    } catch {
      return utf8Name;
    }
  }

  const quotedName = /filename="([^"]+)"/i.exec(header)?.[1];
  if (quotedName) {
    return quotedName;
  }

  return /filename=([^;]+)/i.exec(header)?.[1]?.trim();
};

const sendApiRequest = async (path: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { errorContext, notify, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (init.body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: requestHeaders,
      credentials: 'include',
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    notifyNetworkError(notify);
    throw new NetworkError();
  }

  if (!response.ok) {
    const parsed = await readApiError(response);
    const userMessage = mapApiErrorCode({
      code: parsed.code,
      message: parsed.message,
      retryAfterSeconds: parsed.retryAfterSeconds,
      context: errorContext,
    });
    const error = new ApiRequestError({
      code: parsed.code,
      status: response.status,
      userMessage,
      retryAfterSeconds: parsed.retryAfterSeconds,
    });
    notifyError(error, notify);
    throw error;
  }

  return response;
};

export const apiFetch = async <T>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  const response = await sendApiRequest(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const apiDownload = async (path: string, options: ApiFetchOptions = {}): Promise<void> => {
  const response = await sendApiRequest(path, options);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    triggerBrowserDownload(
      objectUrl,
      filenameFromContentDisposition(response.headers.get('Content-Disposition')),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
