export const FILE_FORMATS = ['jpg', 'png', 'pdf', 'docx'] as const;

export type FileFormat = (typeof FILE_FORMATS)[number];

export const isFileFormat = (value: string): value is FileFormat =>
  (FILE_FORMATS as readonly string[]).includes(value);
