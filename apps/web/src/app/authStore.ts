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
  logout: () => Promise<void>;
  clearSession: () => void;
};

const anonymousState = {
  user: null,
  status: 'anonymous' as const,
  issuedApiKey: null,
};

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  issuedApiKey: null,
  hydrateSession: async (signal) => {
    try {
      const user = await getMeRequest({ signal });
      if (signal?.aborted) {
        return;
      }

      set({ user, status: 'authenticated' });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        return;
      }

      set(anonymousState);
    }
  },
  login: async (input) => {
    const user = await loginRequest(input);
    set({ user, status: 'authenticated', issuedApiKey: null });
  },
  register: async (input) => {
    const result = await registerRequest(input);
    set({ user: result.user, status: 'authenticated', issuedApiKey: result.apiKey });
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.code !== 'unauthorized') {
        throw error;
      }
    }

    set(anonymousState);
  },
  clearSession: () => {
    set(anonymousState);
  },
}));
