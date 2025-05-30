
import { useState, useEffect } from 'react';
import { useCentralPortfolioService } from './useCentralPortfolioService';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { SimReadinessStatus } from '@/types/simReadiness';

export function useSimGuard() {
  const [status, setStatus] = useState<SimReadinessStatus>(simReadinessStore.getStatus());
  const { snapshot: centralSnapshot, isLoading: centralLoading, error: centralError } = useCentralPortfolioService();

  useEffect(() => {
    const unsubscribe = simReadinessStore.subscribe(setStatus);
    return unsubscribe;
  }, []);

  // Enhanced logic using both simReadiness and central portfolio data
  const hasValidPortfolio = !!(centralSnapshot && centralSnapshot.totalValue > 0);
  const isDataLoading = centralLoading || status.state === 'FETCHING';
  const hasErrors = !!(centralError || (status.state === 'UNSTABLE' && status.reason));

  console.log('🛡️ SimGuard status:', {
    simReadinessState: status.state,
    hasValidPortfolio,
    isDataLoading,
    hasErrors,
    centralSnapshot: !!centralSnapshot,
    centralLoading,
    centralError
  });

  // Determine if simulation can start
  const canStart = hasValidPortfolio && !isDataLoading && !hasErrors && status.state === 'READY';
  
  // Determine if running is blocked (more lenient)
  const isRunningBlocked = isDataLoading || (hasErrors && !hasValidPortfolio);
  
  let reason = '';
  if (!canStart) {
    if (isDataLoading) {
      reason = 'Loading portfolio data...';
    } else if (!hasValidPortfolio) {
      reason = 'No valid portfolio data available';
    } else if (hasErrors) {
      reason = centralError || status.reason || 'System error';
    } else if (status.state === 'SIM_RUNNING') {
      reason = 'Simulation already running';
    } else if (status.state === 'IDLE') {
      reason = 'System initializing...';
    } else {
      reason = 'System not ready';
    }
  }

  return {
    canStart,
    isRunningBlocked,
    reason,
    snapshotAge: status.snapshotAge,
    state: status.state,
    portfolio: centralSnapshot || status.portfolio, // Prefer central data
    lastApiPing: status.lastApiPing,
    retryCount: status.retryCount,
    // Additional debug info
    debug: {
      simReadinessState: status.state,
      hasValidPortfolio,
      isDataLoading,
      hasErrors,
      centralSnapshot: !!centralSnapshot,
      centralLoading,
      centralError
    }
  };
}
