import { create } from 'zustand';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type AuthStatus = 'anonymous' | 'authenticated';

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
};

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  status: 'anonymous',
}));
