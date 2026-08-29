import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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
