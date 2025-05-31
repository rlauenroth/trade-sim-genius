
import { useEffect } from 'react';
import { useSimulationState } from './useSimulationState';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { usePortfolioStateConsolidator } from './usePortfolioStateConsolidator';
import { useActivityLog } from './useActivityLog';

export const useEnhancedSimulationState = () => {
  const {
    simulationState,
    isSimulationActive,
    initializeSimulation,
    updateSimulationState,
    pauseSimulation: pauseSimulationState,
    resumeSimulation: resumeSimulationState,
    stopSimulation: stopSimulationState
  } = useSimulationState();

  const { timerState } = useEnhancedSimulationTimers();
  const { getConsistencyReport } = usePortfolioStateConsolidator();
  const { activityLog } = useActivityLog();

  return {
    // Core simulation state
    simulationState,
    isSimulationActive,
    initializeSimulation,
    updateSimulationState,
    pauseSimulationState,
    resumeSimulationState,
    stopSimulationState,
    
    // Enhanced monitoring
    timerState,
    getStateReport: getConsistencyReport,
    activityLog,
    
    // Auto-trade error state (handled by state machine now)
    autoModeError: null
  };
};
