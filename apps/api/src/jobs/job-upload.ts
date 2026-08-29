import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_UPLOAD_BYTES, type UploadFile } from '@/file-store/validate-upload';

export const JobFileInterceptor = FileInterceptor('file', {
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

type MemoryUploadedFile = {
  originalname: string;
  buffer: Uint8Array;
  mimetype?: string;
};

const isMemoryUploadedFile = (value: unknown): value is MemoryUploadedFile => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('originalname' in value) || !('buffer' in value)) {
    return false;
  }

  return typeof value.originalname === 'string' && value.buffer instanceof Uint8Array;
};

export const toUploadFiles = (file: unknown): UploadFile[] => {
  if (!isMemoryUploadedFile(file)) {
    return [];
  }

  return [
    {
      originalName: file.originalname,
      bytes: file.buffer,
      declaredMime: file.mimetype,
    },
  ];
};

export const readTargetFormat = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
