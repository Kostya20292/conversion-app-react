import type { FileFormat } from './file-format';

export const isSupportedConversion = (source: FileFormat, target: FileFormat): boolean => {
  if (source === 'jpg' && target === 'png') {
    return true;
  }

  if (source === 'png' && target === 'jpg') {
    return true;
  }

  if (source === 'docx' && target === 'pdf') {
    return true;
  }

  if (source === 'pdf' && target === 'docx') {
    return true;
  }

  return false;
};
