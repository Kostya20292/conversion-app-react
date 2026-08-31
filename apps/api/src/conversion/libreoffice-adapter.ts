import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
const CONTAINER_INPUT_DIR = '/tmp';
const DOCKER_EXEC_TIMEOUT_MS = 15_000;

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

  logAdapter(logger, `LibreOffice engine=${describeEngine(engine)}`);

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
        await runInDocker(engine, inputPath, outputPath, containerName, sourceFormat, targetFormat);
      } catch (dockerError: unknown) {
        const fellBack = await tryHostFallback(
          logger,
          workDir,
          inputPath,
          sourceFormat,
          targetFormat,
          formatExecError(dockerError),
        );
        if (!fellBack) {
          throw dockerError;
        }
      }

      if (!(await outputFileReady(outputPath))) {
        const fellBack = await tryHostFallback(
          logger,
          workDir,
          inputPath,
          sourceFormat,
          targetFormat,
          'Docker produced no output file',
        );
        if (!fellBack) {
          throw new ApiException('conversion_failed');
        }
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
  inputPath: string,
  outputPath: string,
  containerName: string,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
): Promise<void> => {
  const containerInput = `${CONTAINER_INPUT_DIR}/source.${sourceFormat}`;
  const containerOutput = `${CONTAINER_INPUT_DIR}/source.${targetFormat}`;
  const profileUri = `file://${CONTAINER_INPUT_DIR}/lo-profile-${randomUUID()}`;

  await execDocker(
    engine.dockerBin,
    [
      'create',
      '--name',
      containerName,
      '--init',
      '--network=none',
      '--shm-size',
      '256m',
      '-e',
      'HOME=/tmp',
      '-e',
      'SAL_USE_VCLPLUGIN=svp',
      engine.image,
      'soffice',
      ...sofficeArgs(containerInput, CONTAINER_INPUT_DIR, profileUri, sourceFormat, targetFormat),
    ],
    DOCKER_EXEC_TIMEOUT_MS,
  );

  await execDocker(
    engine.dockerBin,
    ['cp', inputPath, `${containerName}:${containerInput}`],
    DOCKER_EXEC_TIMEOUT_MS,
  );

  await execDocker(engine.dockerBin, ['start', '-a', containerName], ENGINE_TIMEOUT_MS);

  try {
    await execDocker(
      engine.dockerBin,
      ['cp', `${containerName}:${containerOutput}`, outputPath],
      DOCKER_EXEC_TIMEOUT_MS,
    );
  } catch (copyError: unknown) {
    const logs = await containerLogs(engine.dockerBin, containerName);
    throw new Error(
      `LibreOffice Docker produced no output file. ${formatExecError(copyError)}${logs}`,
    );
  }
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
    env: process.env,
  });
};

const tryHostFallback = async (
  logger: Logger,
  workDir: string,
  inputPath: string,
  sourceFormat: OfficeFormat,
  targetFormat: OfficeFormat,
  reason: string,
): Promise<boolean> => {
  const hostBin = await resolveExecutable(LIBREOFFICE_BINARIES);
  if (hostBin === null) {
    logAdapter(logger, `LibreOffice host fallback unavailable: ${reason}`);
    return false;
  }

  logger.warn(`LibreOffice Docker failed, falling back to host (${hostBin}): ${reason}`);
  await runOnHost(hostBin, workDir, inputPath, sourceFormat, targetFormat);
  return true;
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

const execDocker = async (
  dockerBin: string,
  args: readonly string[],
  timeout: number,
): Promise<{ stdout: string; stderr: string }> =>
  execFile(dockerBin, [...args], {
    timeout,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  });

const containerLogs = async (dockerBin: string, containerName: string): Promise<string> => {
  try {
    const { stdout, stderr } = await execDocker(
      dockerBin,
      ['logs', containerName],
      DOCKER_EXEC_TIMEOUT_MS,
    );
    const parts = [stdout.trim(), stderr.trim()].filter((part) => part.length > 0);
    return parts.length === 0 ? '' : `\n${parts.join('\n')}`;
  } catch {
    return '';
  }
};

const outputFileReady = async (outputPath: string): Promise<boolean> => {
  try {
    const info = await stat(outputPath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
};

const describeEngine = (engine: LibreOfficeEngine): string => {
  if (engine.kind === 'docker') {
    return `docker bin=${engine.dockerBin} image=${engine.image}`;
  }

  return `host bin=${engine.bin}`;
};

const logAdapter = (logger: Logger, message: string): void => {
  logger.warn(message);
  if (process.env.CI === 'true') {
    process.stderr.write(`${message}\n`);
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
    await execDocker(dockerBin, ['image', 'inspect', image], DOCKER_EXEC_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
};

const removeContainer = async (dockerBin: string, containerName: string): Promise<void> => {
  try {
    await execDocker(dockerBin, ['rm', '-f', containerName], DOCKER_EXEC_TIMEOUT_MS);
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
