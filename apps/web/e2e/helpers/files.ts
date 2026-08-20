import { Buffer } from 'node:buffer';

export const createJpegFile = () => ({
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
});

export const createDocxFile = () => ({
  name: 'document.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  buffer: Buffer.from('PK\u0003\u0004'),
});
