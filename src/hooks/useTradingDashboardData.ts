
import { useState, useEffect } from 'react';
import { SimulationState } from '@/types/simulation';

interface PortfolioData {
  totalValue: number;
}

export const useTradingDashboardData = (
  simulationState: SimulationState | null,
  portfolioData: PortfolioData | null,
  isSimulationActive: boolean
) => {
  const [timeElapsed, setTimeElapsed] = useState('00:00:00');

  useEffect(() => {
    if (isSimulationActive && simulationState?.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - simulationState.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setTimeElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isSimulationActive, simulationState?.startTime]);

  const hasValidSimulation = () => {
    return simulationState?.startPortfolioValue && simulationState.startPortfolioValue > 0;
  };

  const getProgressValue = () => {
    if (!hasValidSimulation() || !simulationState?.currentPortfolioValue) return 0;
    
    const targetValue = simulationState.startPortfolioValue * 1.01; // 1% Ziel
    const currentProgress = simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
    const targetProgress = targetValue - simulationState.startPortfolioValue;
    
    return Math.min(100, Math.max(0, (currentProgress / targetProgress) * 100));
  };

  const getTotalPnL = () => {
    if (!hasValidSimulation() || !simulationState?.currentPortfolioValue) return 0;
    return simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
  };

  const getTotalPnLPercentage = () => {
    if (!hasValidSimulation() || !simulationState?.currentPortfolioValue) return 0;
    return ((simulationState.currentPortfolioValue - simulationState.startPortfolioValue) / simulationState.startPortfolioValue) * 100;
  };

  const getDisplayPortfolioValue = () => {
    if (simulationState?.currentPortfolioValue && hasValidSimulation()) {
      return simulationState.currentPortfolioValue;
    }
    return portfolioData?.totalValue || 0;
  };

  const getDisplayStartValue = () => {
    // Only return start value if we have a valid simulation that was actually started
    if (!hasValidSimulation()) {
      return null;
    }
    return simulationState.startPortfolioValue;
  };

  return {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation
  };
};
