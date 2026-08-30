import type { FileFormat } from '@/common/domain/file-format';

const FALLBACK_STEM = 'result';
const MAX_BASENAME_LENGTH = 255;

export const sourceFileNameFromUpload = (originalName: string): string => {
  const cleaned = sanitizeBaseName(originalName);
  return cleaned.length > 0 ? cleaned : `${FALLBACK_STEM}`;
};

export const resultFileName = (
  originalName: string | null | undefined,
  targetFormat: FileFormat,
): string => `${fileStem(originalName)}.${targetFormat}`;

export const contentDispositionAttachment = (filename: string): string => {
  const asciiFallback = toAsciiFileName(filename);
  const encoded = encodeRfc5987(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

const fileStem = (originalName: string | null | undefined): string => {
  const base = sanitizeBaseName(originalName ?? '');
  if (base.length === 0) {
    return FALLBACK_STEM;
  }

  const dotIndex = base.lastIndexOf('.');
  const stem = dotIndex > 0 ? base.slice(0, dotIndex) : base;
  return stem.length > 0 ? stem : FALLBACK_STEM;
};

const sanitizeBaseName = (originalName: string): string => {
  const base = originalName.replaceAll('\\', '/').split('/').pop() ?? originalName;
  let cleaned = '';

  for (const char of base) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code === 127 || char === '"' || char === '\\') {
      continue;
    }

    cleaned += char;
  }

  return cleaned.trim().slice(0, MAX_BASENAME_LENGTH);
};

const toAsciiFileName = (filename: string): string => {
  const ascii = filename.replaceAll(/[^\u0020-\u007e]/g, '_').replaceAll(/["\\]/g, '');
  return ascii.length > 0 ? ascii : FALLBACK_STEM;
};

const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replaceAll(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
