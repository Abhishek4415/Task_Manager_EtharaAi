import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: 'PROJECT_LEAD' | 'QUALITY_REVIEWER' | 'TASKER';
  jobTitle?: string;
  projectLeadId?: string | { _id: string; fullName: string; email: string; jobTitle?: string };
  qualityReviewerId?: string | { _id: string; fullName: string; email: string; jobTitle?: string };
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'tasktrack-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
