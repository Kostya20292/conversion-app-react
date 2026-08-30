import { type Dirent } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class StorageService {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async write(key: string, bytes: Uint8Array): Promise<void> {
    const absolutePath = this.resolveInsideRoot(key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, bytes);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveInsideRoot(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveInsideRoot(key));
  }

  async listKeys(): Promise<string[]> {
    return this.collectFiles(this.root);
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const relativeDir = path.relative(this.root, dir);
    if (relativeDir.length > 0 && (isOutsideRoot(relativeDir) || path.isAbsolute(relativeDir))) {
      return [];
    }

    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error: unknown) {
      if (isEnoent(error)) {
        return [];
      }

      throw error;
    }

    const keys: string[] = [];
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        keys.push(...(await this.collectFiles(absolutePath)));
        continue;
      }

      if (entry.isFile()) {
        keys.push(toStorageKey(this.root, absolutePath));
      }
    }

    return keys;
  }

  private resolveInsideRoot(key: string): string {
    if (key.length === 0 || path.isAbsolute(key) || hasParentSegment(key)) {
      throw new Error('Storage key is outside STORAGE_ROOT');
    }

    const normalizedKey = path.normalize(key);
    if (isOutsideRoot(normalizedKey) || path.isAbsolute(normalizedKey)) {
      throw new Error('Storage key is outside STORAGE_ROOT');
    }

    const absolutePath = path.resolve(this.root, normalizedKey);
    const relative = path.relative(this.root, absolutePath);
    if (relative.length === 0 || isOutsideRoot(relative) || path.isAbsolute(relative)) {
      throw new Error('Storage key is outside STORAGE_ROOT');
    }

    return absolutePath;
  }
}

const hasParentSegment = (key: string): boolean =>
  key.split(/[\\/]/).some((segment) => segment === '..');

const isOutsideRoot = (relativePath: string): boolean =>
  relativePath === '..' || relativePath.startsWith(`..${path.sep}`);

const toStorageKey = (root: string, absolutePath: string): string => {
  const relative = path.relative(root, absolutePath);
  if (relative.length === 0 || isOutsideRoot(relative) || path.isAbsolute(relative)) {
    throw new Error('Storage key is outside STORAGE_ROOT');
  }

  return relative.split(path.sep).join('/');
};

const isEnoent = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
