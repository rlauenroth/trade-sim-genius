
import { useState, useEffect, useCallback } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { kucoinService } from '@/services/kucoinService';
import { getCurrentPrice } from '@/utils/kucoinApi';
import { getStoredKeys } from '@/config';
import { toast } from '@/hooks/use-toast';

const TTL_MS = 60 * 1000; // 60 seconds

export const usePortfolioLive = () => {
  const { 
    snapshot, 
    isLoading, 
    error, 
    setSnapshot, 
    setLoading, 
    setError 
  } = usePortfolioStore();

  const fetchPortfolioData = useCallback(async () => {
    const credentials = getStoredKeys();
    if (!credentials) {
      setError('Keine API-Schlüssel verfügbar');
      return;
    }

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
    }
  }, [setSnapshot, setLoading, setError]);

  // Auto-refresh logic with TTL
  useEffect(() => {
    const shouldRefresh = !snapshot || (Date.now() - snapshot.fetchedAt > TTL_MS);
    
    if (shouldRefresh) {
      fetchPortfolioData();
    }

    // Set up interval for regular updates
    const intervalId = setInterval(() => {
      fetchPortfolioData();
    }, TTL_MS);

    return () => clearInterval(intervalId);
  }, [snapshot, fetchPortfolioData]);

  const refresh = useCallback(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    snapshot,
    isLoading,
    error,
    refresh,
    isStale: snapshot ? (Date.now() - snapshot.fetchedAt > TTL_MS) : true
  };
};
