import { create } from 'zustand';
import { DEFAULT_CONVERSION_ROUTE } from '@/constants/conversion';
import type { ConversionRoute } from '@/types/conversion';
import { validateConversionFile } from './validateFile';

type ConversionState = {
  route: ConversionRoute;
  file: File | null;
  error: string | null;
  setRoute: (route: ConversionRoute) => void;
  selectFiles: (files: readonly File[]) => void;
  clearFile: () => void;
};

export const useConversionStore = create<ConversionState>((set, get) => ({
  route: DEFAULT_CONVERSION_ROUTE,
  file: null,
  error: null,
  setRoute: (route) => {
    const { file } = get();
    if (!file) {
      set({ route, error: null });
      return;
    }

    const result = validateConversionFile([file], route);
    set({
      route,
      file: result.ok ? result.file : file,
      error: result.ok ? null : result.message,
    });
  },
  selectFiles: (files) => {
    const result = validateConversionFile(files, get().route);
    if (result.ok) {
      set({ file: result.file, error: null });
      return;
    }

    set({
      file: files.length === 1 ? (files[0] ?? null) : null,
      error: result.message,
    });
  },
  clearFile: () => set({ file: null, error: null }),
}));
