import type { FileFormat } from './file-format';

export const MIME_BY_FORMAT: Record<FileFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
