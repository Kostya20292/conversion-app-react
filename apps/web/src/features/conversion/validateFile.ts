import {
  getConversionRouteLabel,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ROUTE_ACCEPT_EXTENSIONS,
} from '@/constants/conversion';
import type { ConversionRoute } from '@/types/conversion';

export type FileValidationCode =
  'no_file' | 'too_many_files' | 'empty_file' | 'file_too_large' | 'invalid_extension';

export type FileValidationResult =
  { ok: true; file: File } | { ok: false; code: FileValidationCode; message: string };

const formatFileSizeMb = (bytes: number): string => {
  const sizeMb = bytes / (1024 * 1024);
  if (Number.isInteger(sizeMb)) {
    return String(sizeMb);
  }

  return String(Math.round(sizeMb * 10) / 10);
};

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return '';
  }

  return fileName.slice(lastDotIndex).toLowerCase();
};

export const validateConversionFile = (
  files: readonly File[],
  route: ConversionRoute,
): FileValidationResult => {
  if (files.length === 0) {
    return { ok: false, code: 'no_file', message: 'Выберите файл' };
  }

  if (files.length > 1) {
    return {
      ok: false,
      code: 'too_many_files',
      message: 'За раз можно конвертировать только один файл',
    };
  }

  const file = files[0];
  if (!file) {
    return { ok: false, code: 'no_file', message: 'Выберите файл' };
  }

  if (file.size === 0) {
    return { ok: false, code: 'empty_file', message: 'Файл пустой' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `Максимальный размер — ${MAX_FILE_SIZE_MB} МБ. Ваш файл: ${formatFileSizeMb(file.size)} МБ`,
    };
  }

  const extension = getFileExtension(file.name);
  const allowedExtensions = ROUTE_ACCEPT_EXTENSIONS[route];
  if (!allowedExtensions.includes(extension)) {
    const routeLabel = getConversionRouteLabel(route);
    const extensionHint = allowedExtensions.join('/');

    return {
      ok: false,
      code: 'invalid_extension',
      message: `Для ${routeLabel} нужен файл ${extensionHint}`,
    };
  }

  return { ok: true, file };
};
