
import { useState, useCallback } from 'react';
import { SimulationState } from '@/types/simulation';

export const useSimulationState = () => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  const validateSimulationState = useCallback((state: SimulationState, currentPortfolioValue: number): boolean => {
    // If simulation was never properly started or has invalid start value, consider it invalid
    if (!state.startPortfolioValue || state.startPortfolioValue <= 0) {
      return false;
    }
    
    // If the start value is dramatically different from current portfolio (like old mock data)
    // and simulation is not active, consider it stale
    if (!state.isActive && Math.abs(state.startPortfolioValue - currentPortfolioValue) > currentPortfolioValue * 10) {
      console.log('🗑️ Clearing stale simulation data with invalid start value:', state.startPortfolioValue, 'vs current:', currentPortfolioValue);
      return false;
    }
    
    return true;
  }, []);

  const loadSimulationState = useCallback((currentPortfolioValue?: number) => {
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (saved) {
        const state = JSON.parse(saved);
        
        // Validate the loaded state if we have current portfolio value
        if (currentPortfolioValue && !validateSimulationState(state, currentPortfolioValue)) {
          console.log('🗑️ Removing invalid simulation state from localStorage');
          localStorage.removeItem('kiTradingApp_simulationState');
          setSimulationState(null);
          setIsSimulationActive(false);
          return;
        }
        
        setSimulationState(state);
        setIsSimulationActive(state.isActive && !state.isPaused);
      }
    } catch (error) {
      console.error('Error loading simulation state:', error);
      localStorage.removeItem('kiTradingApp_simulationState');
    }
  }, [validateSimulationState]);

  const saveSimulationState = useCallback((state: SimulationState) => {
    try {
      localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(state));
      setSimulationState(state);
    } catch (error) {
      console.error('Error saving simulation state:', error);
    }
  }, []);

  const clearSimulationState = useCallback(() => {
    localStorage.removeItem('kiTradingApp_simulationState');
    setSimulationState(null);
    setIsSimulationActive(false);
  }, []);

  return {
    simulationState,
    isSimulationActive,
    setIsSimulationActive,
    loadSimulationState,
    saveSimulationState,
    clearSimulationState
  };
};
