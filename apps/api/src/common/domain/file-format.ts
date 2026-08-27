export const FILE_FORMATS = ['jpg', 'png', 'pdf', 'docx'] as const;

export type FileFormat = (typeof FILE_FORMATS)[number];
