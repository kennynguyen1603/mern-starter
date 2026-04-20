import { create } from 'zustand';
import type { IUserResponse } from '@mern/shared';

interface AuthState {
  user: IUserResponse | null;
  setUser: (user: IUserResponse) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
