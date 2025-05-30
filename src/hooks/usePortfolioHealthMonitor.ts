
import { useMemo } from 'react';
import { SimulationState } from '@/types/simulation';
import { useCircuitBreakerOptimized } from './useCircuitBreakerOptimized';

export const usePortfolioHealthMonitor = (
  simulationState: SimulationState | null,
  userSettings: any
) => {
  const { getPortfolioHealthStatus } = useCircuitBreakerOptimized();

  // Get portfolio health status (optimized - no frequent calls)
  const portfolioHealthStatus = useMemo(() => {
    if (simulationState && userSettings.tradingStrategy) {
      return getPortfolioHealthStatus(simulationState, userSettings.tradingStrategy);
    }
    return 'HEALTHY';
  }, [simulationState, userSettings.tradingStrategy, getPortfolioHealthStatus]);

  return {
    portfolioHealthStatus
  };
};
