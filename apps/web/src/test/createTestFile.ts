type CreateTestFileOptions = {
  size?: number;
  type?: string;
};

export const createTestFile = (name: string, options: CreateTestFileOptions = {}): File => {
  const size = options.size ?? 256;
  const type = options.type ?? 'application/octet-stream';

  return new File([new Uint8Array(size)], name, { type });
};
