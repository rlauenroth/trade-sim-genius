
import { create } from 'zustand';
import { PortfolioSnapshot } from '@/types/simReadiness';

interface CentralPortfolioState {
  snapshot: PortfolioSnapshot | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number;
  // Actions
  setSnapshot: (snapshot: PortfolioSnapshot) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
  isStale: () => boolean;
}

export const useCentralPortfolioStore = create<CentralPortfolioState>((set, get) => ({
  snapshot: null,
  isLoading: false,
  error: null,
  lastFetchTime: 0,
  
  setSnapshot: (snapshot) => {
    console.log('📊 CentralPortfolioStore: Setting new snapshot:', {
      totalValue: snapshot.totalValue,
      positions: snapshot.positions.length,
      cashUSDT: snapshot.cashUSDT
    });
    set({ 
      snapshot, 
      error: null, 
      isLoading: false, 
      lastFetchTime: Date.now() 
    });
  },
  
  setLoading: (isLoading) => {
    console.log('🔄 CentralPortfolioStore: Setting loading state:', isLoading);
    set({ isLoading });
  },
  
  setError: (error) => {
    console.log('❌ CentralPortfolioStore: Setting error:', error);
    set({ error, isLoading: false });
  },
  
  clearData: () => {
    console.log('🗑️ CentralPortfolioStore: Clearing all data');
    set({ 
      snapshot: null, 
      error: null, 
      isLoading: false, 
      lastFetchTime: 0 
    });
  },
  
  isStale: () => {
    const { lastFetchTime } = get();
    const MAX_AGE = 60000; // 1 minute
    return lastFetchTime === 0 || (Date.now() - lastFetchTime > MAX_AGE);
  }
}));
