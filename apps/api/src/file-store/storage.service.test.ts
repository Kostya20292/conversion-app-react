import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { uploadStorageKey } from './storage-key';
import { StorageService } from './storage.service';

const JOB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAYLOAD = Buffer.from('convertly-upload-bytes');

describe('StorageService (архитектура §3.3 / план §6.1)', () => {
  let root: string;
  let storage: StorageService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'convertly-storage-'));
    storage = new StorageService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads a file only inside STORAGE_ROOT', async () => {
    const key = uploadStorageKey(JOB_ID);

    await storage.write(key, PAYLOAD);

    const absolutePath = path.resolve(root, key);
    expect(absolutePath.startsWith(path.resolve(root) + path.sep)).toBe(true);
    expect(await storage.read(key)).toEqual(PAYLOAD);
  });

  it('deletes a file that was written inside STORAGE_ROOT', async () => {
    const key = uploadStorageKey(JOB_ID);
    await storage.write(key, PAYLOAD);

    await storage.delete(key);

    expect(existsSync(path.resolve(root, key))).toBe(false);
  });

  it('rejects a key with ../ and does not write outside STORAGE_ROOT', async () => {
    const outsidePath = path.join(path.dirname(root), 'escaped.txt');

    await expect(storage.write('../escaped.txt', PAYLOAD)).rejects.toThrow();

    expect(existsSync(outsidePath)).toBe(false);
    expect(await readdir(root)).toEqual([]);
  });

  it('rejects a nested traversal key and does not write outside STORAGE_ROOT', async () => {
    const outsidePath = path.join(path.dirname(root), 'nested-escape.txt');

    await expect(storage.write('uploads/../../nested-escape.txt', PAYLOAD)).rejects.toThrow();

    expect(existsSync(outsidePath)).toBe(false);
    expect(existsSync(path.join(root, 'nested-escape.txt'))).toBe(false);
  });

  it('does not read a file that lives outside STORAGE_ROOT', async () => {
    const outsidePath = path.join(path.dirname(root), 'secret.txt');
    await writeFile(outsidePath, 'secret');

    await expect(storage.read('../secret.txt')).rejects.toThrow();
    await rm(outsidePath);
  });
});
