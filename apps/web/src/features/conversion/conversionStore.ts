import { create } from 'zustand';
import { ApiRequestError, NetworkError } from '@/api/http';
import { createJobRequest, getJobRequest } from '@/api/jobs';
import { mapApiErrorCode } from '@/api/mapApiErrorCode';
import { DEFAULT_CONVERSION_ROUTE, ROUTE_TARGET_FORMAT } from '@/constants/conversion';
import type { ConversionJob } from '@/types/api';
import type { ConversionRoute } from '@/types/conversion';
import { pollConversionJob } from './pollConversionJob';
import { validateConversionFile } from './validateFile';

export type ConversionPhase = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

type ConversionState = {
  route: ConversionRoute;
  file: File | null;
  error: string | null;
  phase: ConversionPhase;
  job: ConversionJob | null;
  setRoute: (route: ConversionRoute) => void;
  selectFiles: (files: readonly File[]) => void;
  clearFile: () => void;
  startConversion: () => Promise<void>;
  retryConversion: () => void;
};

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

let conversionRun = 0;
let activeAbort: AbortController | null = null;

const beginConversionRun = (): AbortController => {
  conversionRun += 1;
  activeAbort?.abort();
  const controller = new AbortController();
  activeAbort = controller;
  return controller;
};

const idleFileState = {
  phase: 'idle' as const,
  job: null,
};

export const useConversionStore = create<ConversionState>((set, get) => ({
  route: DEFAULT_CONVERSION_ROUTE,
  file: null,
  error: null,
  phase: 'idle',
  job: null,
  setRoute: (route) => {
    beginConversionRun();
    const { file } = get();
    if (!file) {
      set({ route, error: null, ...idleFileState });
      return;
    }

    const result = validateConversionFile([file], route);
    set({
      route,
      file: result.ok ? result.file : file,
      error: result.ok ? null : result.message,
      ...idleFileState,
    });
  },
  selectFiles: (files) => {
    beginConversionRun();
    const result = validateConversionFile(files, get().route);
    if (result.ok) {
      set({ file: result.file, error: null, ...idleFileState });
      return;
    }

    set({
      file: files.length === 1 ? (files[0] ?? null) : null,
      error: result.message,
      ...idleFileState,
    });
  },
  clearFile: () => {
    beginConversionRun();
    set({ file: null, error: null, ...idleFileState });
  },
  startConversion: async () => {
    const { file, error, route } = get();
    if (!file || error) {
      return;
    }

    const controller = beginConversionRun();
    const runId = conversionRun;
    set({ phase: 'uploading', error: null, job: null });

    try {
      const created = await createJobRequest(
        { file, targetFormat: ROUTE_TARGET_FORMAT[route] },
        { signal: controller.signal },
      );
      if (runId !== conversionRun) {
        return;
      }

      set({ phase: 'processing', job: created });
      const result = await pollConversionJob({
        getJob: () => getJobRequest(created.id, { signal: controller.signal }),
        signal: controller.signal,
      });
      if (runId !== conversionRun) {
        return;
      }

      if (result.ok) {
        set({ phase: 'completed', job: result.job, error: null });
        return;
      }

      set({
        phase: 'failed',
        error: mapApiErrorCode({ code: result.code }),
      });
    } catch (caught) {
      if (runId !== conversionRun || isAbortError(caught)) {
        return;
      }

      if (caught instanceof NetworkError || caught instanceof ApiRequestError) {
        set({ phase: 'failed', error: caught.userMessage });
        return;
      }

      throw caught;
    }
  },
  retryConversion: () => {
    beginConversionRun();
    set({ phase: 'idle', error: null, job: null });
  },
}));
