import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { validateUpload } from './validate-upload';

const TEN_MIB = 10 * 1024 * 1024;

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

const GIF_BYTES = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;');

const zipLocalFile = (name: string, data: Buffer): Buffer => {
  const nameBytes = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 8);
  header.writeUInt32LE(crc32(data), 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  return Buffer.concat([header, nameBytes, data]);
};

const zipCentralFile = (name: string, data: Buffer, localOffset: number): Buffer => {
  const nameBytes = Buffer.from(name);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt32LE(crc32(data), 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, nameBytes]);
};

const zipEocd = (centralOffset: number, centralSize: number, count: number): Buffer => {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(count, 8);
  header.writeUInt16LE(count, 10);
  header.writeUInt32LE(centralSize, 12);
  header.writeUInt32LE(centralOffset, 16);
  return header;
};

const createZip = (files: Record<string, string>): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const local = zipLocalFile(name, data);
    locals.push(local);
    centrals.push(zipCentralFile(name, data, offset));
    offset += local.length;
  }

  const central = Buffer.concat(centrals);
  return Buffer.concat([...locals, central, zipEocd(offset, central.length, centrals.length)]);
};

const DOCX_BYTES = createZip({
  '[Content_Types].xml':
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
  'word/document.xml':
    '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:document>',
});

const jpegOfSize = (size: number): Buffer => {
  const bytes = Buffer.alloc(size);
  JPEG_BYTES.copy(bytes);
  return bytes;
};

describe('validateUpload (ТЗ §2.2–2.3 / §7.4–7.5 / план §6.3–6.5)', () => {
  it('rejects an upload with no file as invalid_request', async () => {
    await expect(validateUpload({ files: [], targetFormat: 'png' })).rejects.toMatchObject({
      apiErrorCode: 'invalid_request',
    });
  });

  it('rejects two files in one operation as invalid_request', async () => {
    await expect(
      validateUpload({
        files: [
          { originalName: 'a.jpg', bytes: JPEG_BYTES },
          { originalName: 'b.jpg', bytes: JPEG_BYTES },
        ],
        targetFormat: 'png',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'invalid_request' });
  });

  it('rejects a missing target_format as invalid_request', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.jpg', bytes: JPEG_BYTES }],
        targetFormat: undefined,
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'invalid_request' });
  });

  it('rejects a 0-byte file as invalid_file_type', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.jpg', bytes: Buffer.alloc(0) }],
        targetFormat: 'png',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'invalid_file_type' });
  });

  it('rejects a file larger than 10 MB as file_too_large', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.jpg', bytes: jpegOfSize(TEN_MIB + 1) }],
        targetFormat: 'png',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'file_too_large' });
  });

  it('accepts a JPEG of exactly 10 MB for JPG → PNG', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.jpg', bytes: jpegOfSize(TEN_MIB) }],
        targetFormat: 'png',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'jpg', targetFormat: 'png' });
  });

  it('rejects a JPEG named .png as invalid_file_type', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.png', bytes: JPEG_BYTES }],
        targetFormat: 'png',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'invalid_file_type' });
  });

  it('treats a .jpeg extension as jpg when magic bytes are JPEG', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.jpeg', bytes: JPEG_BYTES }],
        targetFormat: 'png',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'jpg', targetFormat: 'png' });
  });

  it('detects PNG by magic bytes for PNG → JPG', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.png', bytes: PNG_BYTES }],
        targetFormat: 'jpg',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'png', targetFormat: 'jpg' });
  });

  it('detects PDF by magic bytes for PDF → DOCX', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'doc.pdf', bytes: PDF_BYTES }],
        targetFormat: 'docx',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'pdf', targetFormat: 'docx' });
  });

  it('detects DOCX by magic bytes for DOCX → PDF', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'doc.docx', bytes: DOCX_BYTES }],
        targetFormat: 'pdf',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'docx', targetFormat: 'pdf' });
  });

  it('rejects a GIF as invalid_file_type', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.gif', bytes: GIF_BYTES }],
        targetFormat: 'png',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'invalid_file_type' });
  });

  it('rejects a valid PNG with target pdf as unsupported_conversion', async () => {
    await expect(
      validateUpload({
        files: [{ originalName: 'photo.png', bytes: PNG_BYTES }],
        targetFormat: 'pdf',
      }),
    ).rejects.toMatchObject({ apiErrorCode: 'unsupported_conversion' });
  });

  it('ignores a lying Content-Type and uses magic bytes plus extension', async () => {
    await expect(
      validateUpload({
        files: [
          {
            originalName: 'photo.jpg',
            bytes: JPEG_BYTES,
            declaredMime: 'image/png',
          },
        ],
        targetFormat: 'png',
      }),
    ).resolves.toMatchObject({ sourceFormat: 'jpg', targetFormat: 'png' });
  });
});
