import { MAX_FILE_SIZE_BYTES } from '@convertly/shared';
import { isSupportedConversion } from '@/common/domain/conversion-pair';
import { FILE_FORMATS, type FileFormat } from '@/common/domain/file-format';
import { ApiException } from '@/common/errors/api-exception';

export const MAX_UPLOAD_BYTES = MAX_FILE_SIZE_BYTES;

const FORMAT_BY_EXTENSION: Record<string, FileFormat> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  pdf: 'pdf',
  docx: 'docx',
};

const FORMAT_BY_FILE_TYPE_EXT: Record<string, FileFormat> = {
  jpg: 'jpg',
  png: 'png',
  pdf: 'pdf',
  docx: 'docx',
};

export type UploadFile = {
  originalName: string;
  bytes: Uint8Array;
  declaredMime?: string;
};

export type ValidateUploadInput = {
  files: readonly UploadFile[];
  targetFormat: string | undefined;
};

export type ValidatedUpload = {
  sourceFormat: FileFormat;
  targetFormat: FileFormat;
};

export const validateUpload = async (input: ValidateUploadInput): Promise<ValidatedUpload> => {
  if (input.files.length !== 1) {
    throw new ApiException('invalid_request');
  }

  if (input.targetFormat === undefined || !isFileFormat(input.targetFormat)) {
    throw new ApiException('invalid_request');
  }

  const file = input.files[0];
  if (!file) {
    throw new ApiException('invalid_request');
  }

  if (file.bytes.byteLength === 0) {
    throw new ApiException('invalid_file_type');
  }

  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ApiException('file_too_large');
  }

  const sourceFormat = await detectSourceFormat(file.originalName, file.bytes);
  if (!isSupportedConversion(sourceFormat, input.targetFormat)) {
    throw new ApiException('unsupported_conversion');
  }

  return { sourceFormat, targetFormat: input.targetFormat };
};

const isFileFormat = (value: string): value is FileFormat =>
  (FILE_FORMATS as readonly string[]).includes(value);

const detectSourceFormat = async (originalName: string, bytes: Uint8Array): Promise<FileFormat> => {
  const fromExtension = FORMAT_BY_EXTENSION[fileExtension(originalName)];
  if (!fromExtension) {
    throw new ApiException('invalid_file_type');
  }

  const fromMagic = await detectFormatByMagic(bytes);
  if (fromMagic !== fromExtension) {
    throw new ApiException('invalid_file_type');
  }

  return fromMagic;
};

const fileExtension = (originalName: string): string => {
  const baseName = originalName.replaceAll('\\', '/').split('/').pop() ?? originalName;
  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === baseName.length - 1) {
    return '';
  }

  return baseName.slice(dotIndex + 1).toLowerCase();
};

const detectFormatByMagic = async (bytes: Uint8Array): Promise<FileFormat> => {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected) {
    throw new ApiException('invalid_file_type');
  }

  const mapped = FORMAT_BY_FILE_TYPE_EXT[detected.ext];
  if (mapped) {
    return mapped;
  }

  if (detected.ext === 'zip' && zipLooksLikeDocx(bytes)) {
    return 'docx';
  }

  throw new ApiException('invalid_file_type');
};

const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;

const zipLooksLikeDocx = (bytes: Uint8Array): boolean => {
  const view = Buffer.from(bytes);
  let offset = 0;

  while (offset + 30 <= view.length) {
    if (view.readUInt32LE(offset) !== ZIP_LOCAL_FILE_SIGNATURE) {
      break;
    }

    const nameLength = view.readUInt16LE(offset + 26);
    const extraLength = view.readUInt16LE(offset + 28);
    const compressedSize = view.readUInt32LE(offset + 18);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > view.length) {
      break;
    }

    const name = view.subarray(nameStart, nameEnd).toString('utf8');
    if (name.startsWith('word/')) {
      return true;
    }

    offset = nameEnd + extraLength + compressedSize;
  }

  return false;
};
