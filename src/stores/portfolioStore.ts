
import { create } from 'zustand';

export interface PortfolioPosition {
  currency: string;
  balance: number;
  available: number;
  usdValue: number;
}

export interface PortfolioSnapshot {
  positions: PortfolioPosition[];
  totalUSDValue: number;
  fetchedAt: number;
}

interface PortfolioStore {
  snapshot: PortfolioSnapshot | null;
  isLoading: boolean;
  error: string | null;
  setSnapshot: (snapshot: PortfolioSnapshot) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSnapshot: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  snapshot: null,
  isLoading: false,
  error: null,
  setSnapshot: (snapshot) => set({ snapshot, error: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearSnapshot: () => set({ snapshot: null, error: null, isLoading: false })
}));
