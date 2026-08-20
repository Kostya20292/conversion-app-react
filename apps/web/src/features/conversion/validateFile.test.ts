import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE_BYTES } from '@/constants/conversion';
import { createTestFile } from '@/test/createTestFile';
import { validateConversionFile } from './validateFile';

describe('validateConversionFile', () => {
  it('отклоняет выбор без файла', () => {
    expect(validateConversionFile([], 'jpg-to-png')).toEqual({
      ok: false,
      code: 'no_file',
      message: 'Выберите файл',
    });
  });

  it('отклоняет больше одного файла за операцию', () => {
    const files = [
      createTestFile('a.jpg', { type: 'image/jpeg' }),
      createTestFile('b.jpg', { type: 'image/jpeg' }),
    ];

    expect(validateConversionFile(files, 'jpg-to-png')).toEqual({
      ok: false,
      code: 'too_many_files',
      message: 'За раз можно конвертировать только один файл',
    });
  });

  it('отклоняет пустой файл', () => {
    const file = createTestFile('photo.jpg', { size: 0, type: 'image/jpeg' });

    expect(validateConversionFile([file], 'jpg-to-png')).toEqual({
      ok: false,
      code: 'empty_file',
      message: 'Файл пустой',
    });
  });

  it('принимает файл ровно 10 МБ', () => {
    const file = createTestFile('photo.jpg', {
      size: MAX_FILE_SIZE_BYTES,
      type: 'image/jpeg',
    });

    expect(validateConversionFile([file], 'jpg-to-png')).toEqual({ ok: true, file });
  });

  it('отклоняет файл больше 10 МБ', () => {
    const file = createTestFile('photo.jpg', {
      size: 11 * 1024 * 1024,
      type: 'image/jpeg',
    });

    expect(validateConversionFile([file], 'jpg-to-png')).toEqual({
      ok: false,
      code: 'file_too_large',
      message: 'Максимальный размер — 10 МБ. Ваш файл: 11 МБ',
    });
  });

  it('принимает .jpg и .jpeg для JPG → PNG', () => {
    const jpg = createTestFile('photo.jpg', { type: 'image/jpeg' });
    const jpeg = createTestFile('photo.jpeg', { type: 'image/jpeg' });

    expect(validateConversionFile([jpg], 'jpg-to-png')).toEqual({ ok: true, file: jpg });
    expect(validateConversionFile([jpeg], 'jpg-to-png')).toEqual({ ok: true, file: jpeg });
  });

  it('отклоняет неверное расширение для JPG → PNG', () => {
    const file = createTestFile('photo.png', { type: 'image/png' });

    expect(validateConversionFile([file], 'jpg-to-png')).toEqual({
      ok: false,
      code: 'invalid_extension',
      message: 'Для JPG → PNG нужен файл .jpg/.jpeg',
    });
  });

  it('принимает .png для PNG → JPG', () => {
    const file = createTestFile('photo.png', { type: 'image/png' });

    expect(validateConversionFile([file], 'png-to-jpg')).toEqual({ ok: true, file });
  });

  it('принимает .docx для DOCX → PDF', () => {
    const file = createTestFile('doc.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(validateConversionFile([file], 'docx-to-pdf')).toEqual({ ok: true, file });
  });

  it('принимает .pdf для PDF → DOCX', () => {
    const file = createTestFile('doc.pdf', { type: 'application/pdf' });

    expect(validateConversionFile([file], 'pdf-to-docx')).toEqual({ ok: true, file });
  });
});
