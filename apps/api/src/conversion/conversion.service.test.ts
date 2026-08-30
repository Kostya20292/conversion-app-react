import { describe, expect, it } from 'vitest';
import { ConversionService } from './conversion.service';

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const TRANSPARENT_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  'base64',
);

const detectExt = async (bytes: Uint8Array): Promise<string | undefined> => {
  const { fileTypeFromBuffer } = await import('file-type');
  return (await fileTypeFromBuffer(bytes))?.ext;
};

describe('ConversionService (ТЗ §2.1 / стек §4 / план §8.1)', () => {
  const conversion = new ConversionService();

  it('converts a JPEG fixture to a PNG (magic bytes)', async () => {
    const result = await conversion.convert({
      bytes: JPEG_BYTES,
      sourceFormat: 'jpg',
      targetFormat: 'png',
    });

    expect(await detectExt(result)).toBe('png');
  });

  it('converts a PNG fixture to a JPEG (magic bytes)', async () => {
    const result = await conversion.convert({
      bytes: PNG_BYTES,
      sourceFormat: 'png',
      targetFormat: 'jpg',
    });

    expect(await detectExt(result)).toBe('jpg');
  });

  it('flattens PNG transparency onto a white background for PNG → JPG', async () => {
    const result = await conversion.convert({
      bytes: TRANSPARENT_PNG_BYTES,
      sourceFormat: 'png',
      targetFormat: 'jpg',
    });
    const sharp = (await import('sharp')).default;
    const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });

    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });
});
