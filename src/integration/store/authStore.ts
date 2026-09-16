/**
 * FILE: src/integration/store/authStore.ts
 * PURPOSE: Zustand store for User authentication state.
 * Manages session token, user profile, and auth lifecycle.
 * Persists to localStorage so users stay logged in across page reloads.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  role: string;
  profile: {
    id: string;
    name: string;
    headline?: string | null;
    profileCompleteness: number;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
  } | null;
}

interface AuthState {
  /** Bearer token for API requests */
  token: string | null;
  /** Current authenticated user */
  user: AuthUser | null;
  /** Whether auth state has been loaded from storage */
  hydrated: boolean;

  // ── Actions ──
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,

      setAuth: (token, user) => set({ token, user }),

      clearAuth: () => set({ token: null, user: null }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'nexis-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

/**
 * Helper: Get auth headers for API requests.
 * Returns an object with Authorization header if a token exists.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  // Fallback 1: GitHub token in localStorage
  try {
    const gh = localStorage.getItem('forge-github-token');
    if (gh && gh.trim()) {
      return { Authorization: `Bearer ${gh.trim()}` };
    }
  } catch {}

  // Fallback 2: Local development fallback to dev_trainee
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return { Authorization: 'Bearer dev_trainee' };
  }

  return {};
}
