import { execFile as execFileCallback } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import type { Logger } from '@nestjs/common';
import { ApiException } from '@/common/errors/api-exception';
import { ENGINE_TIMEOUT_MS } from '@/conversion/engine-timeout';

const execFile = promisify(execFileCallback);
const LIBREOFFICE_BINARIES = ['soffice', 'libreoffice'] as const;

type OfficeFormat = 'docx' | 'pdf';

type ExecFileError = Error & {
  killed?: boolean;
  signal?: NodeJS.Signals | number | null;
};

export const convertWithLibreOffice = async (
  bytes: Uint8Array,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
  logger: Logger,
): Promise<Uint8Array> => {
  const bin = await resolveLibreOfficeBin();
  if (bin === null) {
    logger.error('LibreOffice binary is not in PATH');
    throw new ApiException('conversion_failed');
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'convertly-lo-'));
  const inputPath = path.join(workDir, `source.${sourceFormat}`);
  const outputPath = path.join(workDir, `source.${targetFormat}`);
  const profileUri = pathToFileURL(path.join(workDir, 'profile')).href;

  try {
    await writeFile(inputPath, bytes);
    await execFile(
      bin,
      [
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        '--norestore',
        `-env:UserInstallation=${profileUri}`,
        '--convert-to',
        targetFormat,
        '--outdir',
        workDir,
        inputPath,
      ],
      { timeout: ENGINE_TIMEOUT_MS },
    );
    const output = await readFile(outputPath);
    if (output.byteLength === 0) {
      throw new ApiException('conversion_failed');
    }

    return output;
  } catch (error: unknown) {
    if (error instanceof ApiException) {
      throw error;
    }

    if (isExecTimeout(error)) {
      logger.error('LibreOffice conversion timed out');
      throw new ApiException('conversion_timeout', undefined, error);
    }

    logger.error('LibreOffice conversion failed');
    throw new ApiException('conversion_failed', undefined, error);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};

const resolveLibreOfficeBin = async (): Promise<string | null> => {
  const pathEnv = process.env.PATH;
  if (pathEnv === undefined || pathEnv.length === 0) {
    return null;
  }

  for (const dir of pathEnv.split(path.delimiter)) {
    if (dir.length === 0) {
      continue;
    }

    for (const name of LIBREOFFICE_BINARIES) {
      const candidate = path.join(dir, name);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  return null;
};

const isExecTimeout = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const execError = error as ExecFileError;
  return execError.killed === true && execError.signal === 'SIGTERM';
};
