import { create } from 'zustand';
import {
  getMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginRequest,
  type RegisterRequest,
} from '@/api/auth';
import { ApiRequestError } from '@/api/http';
import { useConversionStore } from '@/features/conversion/conversionStore';
import { clearSessionHint, hasSessionHint, setSessionHint } from '@/lib/sessionHint';
import type { AuthUser } from '@/types/api';

export type { AuthUser };

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  issuedApiKey: string | null;
  hydrateSession: (signal?: AbortSignal) => Promise<void>;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  rememberIssuedApiKey: (apiKey: string) => void;
  applyUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  clearSession: () => void;
};

const LEGACY_ISSUED_API_KEY_STORAGE = 'convertly.issuedApiKey';

const issuedApiKeyStorageKey = (userId: string): string => `convertly.issuedApiKey.${userId}`;

const anonymousState = {
  user: null,
  status: 'anonymous' as const,
  issuedApiKey: null,
};

const readStoredIssuedApiKey = (userId: string): string | null => {
  try {
    const stored = localStorage.getItem(issuedApiKeyStorageKey(userId));
    if (stored) {
      return stored;
    }

    const legacy = sessionStorage.getItem(LEGACY_ISSUED_API_KEY_STORAGE);
    if (!legacy) {
      return null;
    }

    localStorage.setItem(issuedApiKeyStorageKey(userId), legacy);
    sessionStorage.removeItem(LEGACY_ISSUED_API_KEY_STORAGE);
    return legacy;
  } catch {
    return null;
  }
};

const persistIssuedApiKey = (userId: string, apiKey: string): void => {
  try {
    localStorage.setItem(issuedApiKeyStorageKey(userId), apiKey);
  } catch {
    return;
  }
};

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  issuedApiKey: null,
  hydrateSession: async (signal) => {
    if (!hasSessionHint()) {
      if (signal?.aborted) {
        return;
      }

      set(anonymousState);
      return;
    }

    try {
      const user = await getMeRequest({ signal });
      if (signal?.aborted) {
        return;
      }

      setSessionHint();
      set({
        user,
        status: 'authenticated',
        issuedApiKey: readStoredIssuedApiKey(user.id),
      });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        return;
      }

      clearSessionHint();
      set(anonymousState);
    }
  },
  login: async (input) => {
    const user = await loginRequest(input);
    setSessionHint();
    set({
      user,
      status: 'authenticated',
      issuedApiKey: readStoredIssuedApiKey(user.id),
    });
  },
  register: async (input) => {
    const result = await registerRequest(input);
    persistIssuedApiKey(result.user.id, result.apiKey);
    setSessionHint();
    set({ user: result.user, status: 'authenticated', issuedApiKey: result.apiKey });
  },
  rememberIssuedApiKey: (apiKey) => {
    const userId = get().user?.id;
    if (userId) {
      persistIssuedApiKey(userId, apiKey);
    }

    set({ issuedApiKey: apiKey });
  },
  applyUser: (user) => {
    setSessionHint();
    set({ user, status: 'authenticated' });
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.code !== 'unauthorized') {
        throw error;
      }
    }

    clearSessionHint();
    set(anonymousState);
    useConversionStore.getState().clearFile();
  },
  clearSession: () => {
    clearSessionHint();
    set(anonymousState);
    useConversionStore.getState().clearFile();
  },
}));
