import { create } from 'zustand';
import type { User } from '../lib/types';
type Auth = {
  user: User | null;
  token: string | null;
  ready: boolean;
  setSession: (token: string, user: User) => void;
  clear: () => void;
};
export const useAuth = create<Auth>((set) => ({
  user: null,
  token: null,
  ready: false,
  setSession: (token, user) => set({ token, user, ready: true }),
  clear: () => set({ user: null, token: null, ready: true }),
}));
