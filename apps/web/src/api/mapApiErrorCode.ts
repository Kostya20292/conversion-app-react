import type { ApiErrorCode, ApiErrorContext } from '@/types/api';

export const API_ERROR_CODES = [
  'invalid_request',
  'unsupported_conversion',
  'invalid_file_type',
  'file_too_large',
  'unauthorized',
  'not_found',
  'gone',
  'conversion_failed',
  'rate_limited',
  'internal_error',
  'conversion_timeout',
] as const satisfies readonly ApiErrorCode[];

export const isApiErrorCode = (value: string): value is ApiErrorCode =>
  (API_ERROR_CODES as readonly string[]).includes(value);

export const apiErrorCodeFromStatus = (status: number): ApiErrorCode => {
  if (status === 401 || status === 403) {
    return 'unauthorized';
  }

  if (status === 404) {
    return 'not_found';
  }

  if (status === 410) {
    return 'gone';
  }

  if (status === 413) {
    return 'file_too_large';
  }

  if (status === 422) {
    return 'conversion_failed';
  }

  if (status === 429) {
    return 'rate_limited';
  }

  if (status === 504) {
    return 'conversion_timeout';
  }

  if (status >= 500) {
    return 'internal_error';
  }

  return 'invalid_request';
};

export type MapApiErrorInput = {
  code: ApiErrorCode;
  message?: string;
  retryAfterSeconds?: number;
  context?: ApiErrorContext;
};

const MESSAGE_BY_CODE: Record<ApiErrorCode, string> = {
  invalid_request: 'Некорректный запрос',
  unsupported_conversion: 'Это направление конвертации не поддерживается',
  invalid_file_type: 'Файл повреждён или имеет неверный тип',
  file_too_large: 'Максимальный размер — 10 МБ',
  unauthorized: 'Сессия истекла',
  not_found: 'Ничего не найдено',
  gone: 'Файл больше недоступен (истёк срок хранения)',
  conversion_failed: 'Не удалось конвертировать. Файл может быть повреждён',
  rate_limited: 'Слишком много запросов',
  internal_error: 'Сервис временно недоступен',
  conversion_timeout: 'Превышено время конвертации',
};

export const mapApiErrorCode = ({
  code,
  context,
  retryAfterSeconds,
}: MapApiErrorInput): string => {
  if (code === 'rate_limited' && retryAfterSeconds !== undefined) {
    return `Слишком много запросов. Подождите ${retryAfterSeconds} сек`;
  }

  if (code === 'invalid_request' && context === 'register') {
    return 'Этот email уже зарегистрирован';
  }

  if (code === 'unauthorized' && context === 'login') {
    return 'Неверный email или пароль';
  }

  if (code === 'gone' && context === 'share') {
    return 'Ссылка больше недоступна';
  }

  return MESSAGE_BY_CODE[code];
};

export const mapNetworkError = (): string => 'Не удалось загрузить. Проверьте соединение';
