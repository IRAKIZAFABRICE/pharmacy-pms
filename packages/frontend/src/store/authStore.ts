// packages/frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  isActive?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  userRole: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      userRole: null,
      login: (token, user) => set({ 
        token, 
        user, 
        isAuthenticated: true,
        userRole: user.role 
      }),
      logout: () => set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        userRole: null 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);