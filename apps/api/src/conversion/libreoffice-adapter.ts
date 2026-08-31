import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import type { Logger } from '@nestjs/common';
import { ApiException } from '@/common/errors/api-exception';
import { resolveStorageRoot } from '@/config/env';
import { ENGINE_TIMEOUT_MS } from './engine-timeout';

const execFile = promisify(execFileCallback);
const LIBREOFFICE_BINARIES = ['soffice', 'libreoffice'] as const;
const CONTAINER_WORK_DIR = '/work';
const CONTAINER_PROFILE_URI = 'file:///work/profile';

export const DEFAULT_LIBREOFFICE_DOCKER_IMAGE = 'convertly-libreoffice:local';

type OfficeFormat = 'docx' | 'pdf';

type ExecFileError = Error & {
  killed?: boolean;
  signal?: NodeJS.Signals | number | null;
  stderr?: string;
  stdout?: string;
  code?: string | number;
};

type LibreOfficeEngine =
  { kind: 'docker'; dockerBin: string; image: string } | { kind: 'host'; bin: string };

export const convertWithLibreOffice = async (
  bytes: Uint8Array,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
  logger: Logger,
): Promise<Uint8Array> => {
  const engine = await resolveLibreOfficeEngine(logger);
  if (engine === null) {
    throw new ApiException('conversion_failed');
  }

  const workDir = await createLibreOfficeWorkDir();
  await chmod(workDir, 0o777);
  const inputPath = path.join(workDir, `source.${sourceFormat}`);
  const outputPath = path.join(workDir, `source.${targetFormat}`);
  const containerName = `convertly-lo-${randomUUID()}`;

  try {
    await writeFile(inputPath, bytes);
    await chmod(inputPath, 0o666);
    if (engine.kind === 'docker') {
      try {
        await runInDocker(engine, workDir, containerName, sourceFormat, targetFormat);
      } catch (dockerError: unknown) {
        const hostBin = await resolveExecutable(LIBREOFFICE_BINARIES);
        if (hostBin === null) {
          throw dockerError;
        }

        logger.warn(
          `LibreOffice Docker run failed, falling back to host: ${formatExecError(dockerError)}`,
        );
        await runOnHost(hostBin, workDir, inputPath, sourceFormat, targetFormat);
      }
    } else {
      await runOnHost(engine.bin, workDir, inputPath, sourceFormat, targetFormat);
    }

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
      logger.error(`LibreOffice conversion timed out: ${formatExecError(error)}`);
      throw new ApiException('conversion_timeout', undefined, error);
    }

    logger.error(`LibreOffice conversion failed: ${formatExecError(error)}`);
    throw new ApiException('conversion_failed', undefined, error);
  } finally {
    if (engine.kind === 'docker') {
      await removeContainer(engine.dockerBin, containerName);
    }

    await rm(workDir, { recursive: true, force: true });
  }
};

const resolveLibreOfficeEngine = async (logger: Logger): Promise<LibreOfficeEngine | null> => {
  const image = process.env.LIBREOFFICE_DOCKER_IMAGE?.trim() || DEFAULT_LIBREOFFICE_DOCKER_IMAGE;
  const dockerBin = await resolveExecutable(['docker'], extraDockerDirs());
  if (dockerBin !== null) {
    if (await dockerImageExists(dockerBin, image)) {
      return { kind: 'docker', dockerBin, image };
    }

    logger.warn(
      `LibreOffice Docker image ${image} is not available. Start Docker Desktop and run: docker compose build libreoffice`,
    );
  } else {
    logger.warn('Docker CLI is not in PATH; trying host LibreOffice');
  }

  const hostBin = await resolveExecutable(LIBREOFFICE_BINARIES);
  if (hostBin !== null) {
    return { kind: 'host', bin: hostBin };
  }

  logger.error(`LibreOffice is unavailable (need Docker image ${image} or soffice in PATH)`);
  return null;
};

const runInDocker = async (
  engine: Extract<LibreOfficeEngine, { kind: 'docker' }>,
  workDir: string,
  containerName: string,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
): Promise<void> => {
  const containerInput = `${CONTAINER_WORK_DIR}/source.${sourceFormat}`;
  await execFile(
    engine.dockerBin,
    [
      'run',
      '--rm',
      '--init',
      '--network=none',
      '--name',
      containerName,
      '-e',
      'HOME=/work',
      '-e',
      'SAL_USE_VCLPLUGIN=svp',
      '-v',
      `${workDir}:${CONTAINER_WORK_DIR}`,
      engine.image,
      'soffice',
      ...sofficeArgs(
        containerInput,
        CONTAINER_WORK_DIR,
        CONTAINER_PROFILE_URI,
        sourceFormat,
        targetFormat,
      ),
    ],
    { timeout: ENGINE_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
  );
};

const runOnHost = async (
  bin: string,
  workDir: string,
  inputPath: string,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
): Promise<void> => {
  const profileUri = pathToFileURL(path.join(workDir, 'profile')).href;
  await execFile(bin, sofficeArgs(inputPath, workDir, profileUri, sourceFormat, targetFormat), {
    timeout: ENGINE_TIMEOUT_MS,
  });
};

const sofficeArgs = (
  inputPath: string,
  outDir: string,
  profileUri: string,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
): string[] => {
  const args = [
    '--headless',
    '--nologo',
    '--nofirststartwizard',
    '--norestore',
    `-env:UserInstallation=${profileUri}`,
  ];
  if (sourceFormat === 'pdf' && targetFormat === 'docx') {
    args.push('--infilter=writer_pdf_import');
  }

  args.push('--convert-to', targetFormat, '--outdir', outDir, inputPath);
  return args;
};

const createLibreOfficeWorkDir = async (): Promise<string> => {
  try {
    const root = path.join(resolveStorageRoot(process.env.STORAGE_ROOT ?? 'storage'), 'lo-tmp');
    await mkdir(root, { recursive: true });
    return await mkdtemp(path.join(root, 'job-'));
  } catch {
    return mkdtemp(path.join(tmpdir(), 'convertly-lo-'));
  }
};

const formatExecError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const execError = error as ExecFileError;
  const parts = [execError.message];
  if (typeof execError.stderr === 'string' && execError.stderr.trim().length > 0) {
    parts.push(execError.stderr.trim());
  }
  if (typeof execError.stdout === 'string' && execError.stdout.trim().length > 0) {
    parts.push(execError.stdout.trim());
  }

  return parts.join('\n');
};

const extraDockerDirs = (): string[] => {
  const dirs = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/Applications/Docker.app/Contents/Resources/bin',
  ];
  const home = process.env.HOME;
  if (home !== undefined && home.length > 0) {
    dirs.push(path.join(home, '.docker/bin'));
  }

  return dirs;
};

const resolveExecutable = async (
  names: readonly string[],
  extraDirs: readonly string[] = [],
): Promise<string | null> => {
  const pathEnv = process.env.PATH;
  const dirs = [
    ...(pathEnv === undefined || pathEnv.length === 0 ? [] : pathEnv.split(path.delimiter)),
    ...extraDirs,
  ].filter((dir) => dir.length > 0);

  const seen = new Set<string>();
  for (const dir of dirs) {
    const normalized = path.normalize(dir);
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    for (const name of names) {
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

const dockerImageExists = async (dockerBin: string, image: string): Promise<boolean> => {
  try {
    await execFile(dockerBin, ['image', 'inspect', image], { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
};

const removeContainer = async (dockerBin: string, containerName: string): Promise<void> => {
  try {
    await execFile(dockerBin, ['rm', '-f', containerName], { timeout: 15_000 });
  } catch {
    return;
  }
};

const isExecTimeout = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const execError = error as ExecFileError;
  return execError.killed === true && execError.signal === 'SIGTERM';
};
