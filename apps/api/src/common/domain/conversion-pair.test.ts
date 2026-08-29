import { describe, expect, it } from 'vitest';
import { isSupportedConversion } from '@/common/domain/conversion-pair';
import type { FileFormat } from './file-format';

describe('conversion pairs (ТЗ §2.1 / план §6)', () => {
  it.each([
    ['jpg', 'png'],
    ['png', 'jpg'],
    ['docx', 'pdf'],
    ['pdf', 'docx'],
  ] as const)('allows %s → %s', (source: FileFormat, target: FileFormat) => {
    expect(isSupportedConversion(source, target)).toBe(true);
  });

  it.each([
    ['jpg', 'jpg'],
    ['png', 'pdf'],
    ['jpg', 'docx'],
    ['pdf', 'png'],
    ['docx', 'jpg'],
  ] as const)('rejects %s → %s as unsupported', (source: FileFormat, target: FileFormat) => {
    expect(isSupportedConversion(source, target)).toBe(false);
  });
});
