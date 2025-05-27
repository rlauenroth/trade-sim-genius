
import { useState, useEffect } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { SimReadinessStatus, PortfolioSnapshot } from '@/types/simReadiness';

export const useSimReadinessPortfolio = () => {
  const [status, setStatus] = useState<SimReadinessStatus>(simReadinessStore.getStatus());

  useEffect(() => {
    const unsubscribe = simReadinessStore.subscribe(setStatus);
    return unsubscribe;
  }, []);

  // Convert simReadiness portfolio format to portfolioStore format
  const convertedSnapshot = status.portfolio ? {
    positions: status.portfolio.positions,
    totalUSDValue: status.portfolio.totalValue,
    fetchedAt: status.portfolio.fetchedAt
  } : null;

  return {
    snapshot: convertedSnapshot,
    isLoading: status.state === 'FETCHING',
    error: status.state === 'UNSTABLE' ? status.reason : null,
    refresh: () => simReadinessStore.forceRefresh(),
    isStale: status.snapshotAge > 60000, // 60 seconds
    state: status.state
  };
};
