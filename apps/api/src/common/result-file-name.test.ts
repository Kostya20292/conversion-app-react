import { describe, expect, it } from 'vitest';
import {
  contentDispositionAttachment,
  resultFileName,
  sourceFileNameFromUpload,
} from './result-file-name';

describe('result file name (ТЗ §4.5 — имя как у исходника)', () => {
  it.each([
    ['photo.jpg', 'png', 'photo.png'],
    ['photo.jpeg', 'png', 'photo.png'],
    ['My Photo.JPG', 'png', 'My Photo.png'],
    ['report.final.docx', 'pdf', 'report.final.pdf'],
    ['slides.pdf', 'docx', 'slides.docx'],
  ] as const)('keeps the stem of %s for %s → %s', (original, target, expected) => {
    expect(resultFileName(original, target)).toBe(expected);
  });

  it('uses only the basename, not a path', () => {
    expect(resultFileName('../../etc/passwd.jpg', 'png')).toBe('passwd.png');
    expect(sourceFileNameFromUpload('uploads/vacation.jpg')).toBe('vacation.jpg');
  });

  it('falls back to result.<format> when the original name is missing', () => {
    expect(resultFileName(null, 'png')).toBe('result.png');
    expect(resultFileName('', 'pdf')).toBe('result.pdf');
  });

  it('puts the UTF-8 name into Content-Disposition filename*', () => {
    const header = contentDispositionAttachment('фото.png');
    expect(header).toContain('filename="');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent('фото.png'));
  });
});
