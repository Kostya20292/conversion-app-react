import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_CHILDREN = ['uploads', 'results', 'profile'] as const;

export const ensureStorageDirectories = async (storageRoot: string): Promise<void> => {
  await Promise.all(
    STORAGE_CHILDREN.map((name) => mkdir(path.join(storageRoot, name), { recursive: true })),
  );
};
