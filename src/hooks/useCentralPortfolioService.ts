
import { useCallback, useEffect, useRef } from 'react';
import { useCentralPortfolioStore } from '@/stores/centralPortfolioStore';
import { kucoinService } from '@/services/kucoinService';
import { toast } from '@/hooks/use-toast';
import { loggingService } from '@/services/loggingService';

export const useCentralPortfolioService = () => {
  const {
    snapshot,
    isLoading,
    error,
    setSnapshot,
    setLoading,
    setError,
    clearData,
    isStale
  } = useCentralPortfolioStore();

  // Prevent auto-fetch loops
  const autoFetchTriggered = useRef<boolean>(false);
  const lastAutoFetchTime = useRef<number>(0);
  const AUTO_FETCH_COOLDOWN = 10000; // 10 seconds

  const fetchPortfolio = useCallback(async (forceRefresh = false) => {
    // Avoid duplicate fetches
    if (isLoading && !forceRefresh) {
      console.log('🔄 Portfolio fetch already in progress, skipping...');
      return;
    }

    // Use cache if data is fresh and not forcing refresh
    if (!forceRefresh && snapshot && !isStale()) {
      console.log('✅ Using cached portfolio data (still fresh)');
      return;
    }

    console.log('🚀 CentralPortfolioService: Starting portfolio fetch...', { forceRefresh });
    setLoading(true);
    setError(null);

    try {
      const portfolioData = await kucoinService.fetchPortfolio();
      
      console.log('✅ CentralPortfolioService: Portfolio fetched successfully:', {
        totalValue: portfolioData.totalValue,
        positions: portfolioData.positions.length,
        cashUSDT: portfolioData.cashUSDT
      });

      setSnapshot(portfolioData);
      
      loggingService.logEvent('PORTFOLIO_UPDATE', 'Portfolio fetched successfully', {
        totalValue: portfolioData.totalValue,
        positionCount: portfolioData.positions.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ CentralPortfolioService: Portfolio fetch failed:', error);
      
      setError(errorMessage);
      
      loggingService.logError('Portfolio fetch failed in central service', {
        error: errorMessage
      });

      // Don't show toast for every error to avoid spam
      if (forceRefresh) {
        toast({
          title: "Portfolio-Fehler",
          description: "Portfolio-Daten konnten nicht geladen werden",
          variant: "destructive"
        });
      }
    }
  }, [isLoading, snapshot, isStale, setLoading, setError, setSnapshot]);

  // Optimized auto-fetch on mount with debouncing
  useEffect(() => {
    const now = Date.now();
    const shouldAutoFetch = (!snapshot || isStale()) && 
                           !autoFetchTriggered.current &&
                           (now - lastAutoFetchTime.current > AUTO_FETCH_COOLDOWN);

    if (shouldAutoFetch) {
      console.log('🔄 Auto-fetching portfolio on mount (debounced)');
      autoFetchTriggered.current = true;
      lastAutoFetchTime.current = now;
      
      fetchPortfolio();

      // Reset the flag after cooldown
      setTimeout(() => {
        autoFetchTriggered.current = false;
      }, AUTO_FETCH_COOLDOWN);
    }
  }, [fetchPortfolio, snapshot, isStale]);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    console.log('🔄 Manual portfolio refresh triggered');
    fetchPortfolio(true);
  }, [fetchPortfolio]);

  return {
    snapshot,
    isLoading,
    error,
    refresh,
    clearData,
    isStale: isStale()
  };
};
