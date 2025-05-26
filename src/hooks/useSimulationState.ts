
import { useState, useCallback } from 'react';
import { SimulationState } from '@/types/simulation';

export const useSimulationState = () => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  const loadSimulationState = useCallback(() => {
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (saved) {
        const state = JSON.parse(saved);
        setSimulationState(state);
        setIsSimulationActive(state.isActive && !state.isPaused);
      }
    } catch (error) {
      console.error('Error loading simulation state:', error);
    }
  }, []);

  const saveSimulationState = useCallback((state: SimulationState) => {
    try {
      localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(state));
      setSimulationState(state);
    } catch (error) {
      console.error('Error saving simulation state:', error);
    }
  }, []);

  return {
    simulationState,
    isSimulationActive,
    setIsSimulationActive,
    loadSimulationState,
    saveSimulationState
  };
};
