import { create } from 'zustand';
import { User, Catalog } from './types';

interface AuthState {
  user: User | null;
  session: any | null;
  setAuth: (user: User | null, session: any | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setAuth: (user, session) => {
    set({ user, session });
    if (user) {
      if (localStorage.getItem('app_active_user')) {
        localStorage.setItem('app_active_user', JSON.stringify(user));
      } else if (sessionStorage.getItem('app_active_user')) {
        sessionStorage.setItem('app_active_user', JSON.stringify(user));
      }
    }
  },
  setUser: (user) => {
    set({ user });
    if (user) {
      if (localStorage.getItem('app_active_user')) {
        localStorage.setItem('app_active_user', JSON.stringify(user));
      } else if (sessionStorage.getItem('app_active_user')) {
        sessionStorage.setItem('app_active_user', JSON.stringify(user));
      }
    }
  },
  logout: () => {
    try {
      localStorage.removeItem('app_active_user');
      sessionStorage.removeItem('app_active_user');
    } catch (e) {
      console.warn('Error removing active user from storage:', e);
    }
    set({ user: null, session: null });
  },
}));

interface CatalogState {
  currentCatalog: Catalog | null;
  setCurrentCatalog: (catalog: Catalog | null) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  currentCatalog: null,
  setCurrentCatalog: (catalog) => set({ currentCatalog: catalog }),
}));
