import { describe, expect, it } from 'vitest';
import { FILE_FORMATS } from './file-format';

describe('FILE_FORMATS (ТЗ §2.1 / §3.2)', () => {
  it('allows only the v1 formats (jpeg stored as jpg)', () => {
    expect([...FILE_FORMATS]).toEqual(['jpg', 'png', 'pdf', 'docx']);
  });
});
