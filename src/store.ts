import { create } from 'zustand';
import { User, Catalog } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token || '');
    set({ user, token });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
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
