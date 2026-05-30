'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser } from './auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hasHydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, hasHydrated: true }),
      clearAuth: () => set({ user: null, accessToken: null, hasHydrated: true }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'bbt-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
