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
  },
  setUser: (user) => {
    set({ user });
  },
  logout: () => {
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
