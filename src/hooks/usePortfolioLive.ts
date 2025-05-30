
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { kucoinService } from '@/services/kucoinService';
import { getCurrentPrice } from '@/utils/kucoinApi';
import { getStoredKeys } from '@/config';
import { toast } from '@/hooks/use-toast';
import { SIM_CONFIG } from '@/services/cacheService';

export const usePortfolioLive = () => {
  const { 
    snapshot, 
    isLoading, 
    error, 
    setSnapshot, 
    setLoading, 
    setError 
  } = usePortfolioStore();

  const fetchInProgress = useRef<boolean>(false);
  const lastFetchTime = useRef<number>(0);

  const fetchPortfolioData = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      console.log('🔄 Portfolio fetch already in progress, skipping...');
      return;
    }

    const credentials = getStoredKeys();
    if (!credentials) {
      setError('Keine API-Schlüssel verfügbar');
      return;
    }

    // Avoid too frequent fetches
    const now = Date.now();
    if (now - lastFetchTime.current < 5000) { // 5 second minimum interval
      console.log('🔄 Portfolio fetch rate limited, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching live portfolio data...');
      const portfolioSnapshot = await kucoinService.fetchPortfolio();
      
      // Convert to our store format
      const positions = portfolioSnapshot.positions.map(pos => ({
        currency: pos.currency,
        balance: pos.balance,
        available: pos.available,
        usdValue: pos.usdValue
      }));

      const newSnapshot = {
        positions,
        totalUSDValue: portfolioSnapshot.totalValue,
        fetchedAt: Date.now()
      };

      setSnapshot(newSnapshot);
      console.log('✅ Portfolio data fetched successfully:', newSnapshot);
      
    } catch (error) {
      console.error('❌ Portfolio fetch failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setError(errorMessage);
      
      toast({
        title: "Portfolio-Fehler",
        description: "Live-Daten konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      fetchInProgress.current = false;
    }
  }, [setSnapshot, setLoading, setError]);

  // Optimized auto-refresh logic with rate limiting
  useEffect(() => {
    const shouldRefresh = !snapshot || (Date.now() - snapshot.fetchedAt > SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);
    
    if (shouldRefresh && !fetchInProgress.current) {
      fetchPortfolioData();
    }

    // Set up interval for regular updates with coordination check
    const intervalId = setInterval(() => {
      if (!fetchInProgress.current) {
        fetchPortfolioData();
      }
    }, SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [snapshot, fetchPortfolioData]);

  const refresh = useCallback(() => {
    if (!fetchInProgress.current) {
      fetchPortfolioData();
    }
  }, [fetchPortfolioData]);

  return {
    snapshot,
    isLoading,
    error,
    refresh,
    isStale: snapshot ? (Date.now() - snapshot.fetchedAt > SIM_CONFIG.PORTFOLIO_REFRESH_INTERVAL) : true
  };
};
