import type { ConversionRoute } from '@/types/conversion';

export const CONVERSION_ROUTE_OPTIONS = [
  { value: 'jpg-to-png' as const, label: 'JPG → PNG' },
  { value: 'png-to-jpg' as const, label: 'PNG → JPG' },
  { value: 'docx-to-pdf' as const, label: 'DOCX → PDF' },
  { value: 'pdf-to-docx' as const, label: 'PDF → DOCX' },
] as const;

export const DEFAULT_CONVERSION_ROUTE: ConversionRoute = 'jpg-to-png';
