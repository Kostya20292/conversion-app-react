import type { JobFileFormat } from '@/types/api';
import type { ConversionRoute } from '@/types/conversion';

export { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@convertly/shared';

export const CONVERSION_ROUTE_OPTIONS = [
  { value: 'jpg-to-png' as const, label: 'JPG → PNG' },
  { value: 'png-to-jpg' as const, label: 'PNG → JPG' },
  { value: 'docx-to-pdf' as const, label: 'DOCX → PDF' },
  { value: 'pdf-to-docx' as const, label: 'PDF → DOCX' },
] as const;

export const ROUTE_ACCEPT_EXTENSIONS: Record<ConversionRoute, readonly string[]> = {
  'jpg-to-png': ['.jpg', '.jpeg'],
  'png-to-jpg': ['.png'],
  'docx-to-pdf': ['.docx'],
  'pdf-to-docx': ['.pdf'],
};

export const DEFAULT_CONVERSION_ROUTE: ConversionRoute = 'jpg-to-png';

export const ROUTE_TARGET_FORMAT: Record<ConversionRoute, JobFileFormat> = {
  'jpg-to-png': 'png',
  'png-to-jpg': 'jpg',
  'docx-to-pdf': 'pdf',
  'pdf-to-docx': 'docx',
};

export const getConversionRouteLabel = (route: ConversionRoute): string => {
  const option = CONVERSION_ROUTE_OPTIONS.find((item) => item.value === route);
  return option?.label ?? route;
};
