
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useSimulationActions } from './useSimulationActions';
import { useExitScreening } from './useExitScreening';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';

export const useSimulationLifecycle = (
  clearTimer: () => void,
  setCurrentSignal: (signal: Signal | null) => void,
  setAvailableSignals: (signals: Signal[]) => void,
  initializeSimulation: (data: any) => SimulationState,
  updateSimulationState: (state: SimulationState) => void,
  pauseSimulationState: () => void,
  resumeSimulationState: () => void,
  stopSimulationState: () => void,
  startAISignalGenerationWithCandidates: (isActive: boolean, addLogEntry: any, executeAutoTrade?: any, updateSimulationState?: any) => Promise<void>,
  addLogEntry: (type: any, message: string) => void
) => {
  const { 
    startSimulation: startSimulationAction, 
    stopSimulation: stopSimulationAction, 
    pauseSimulation: pauseSimulationAction, 
    resumeSimulation: resumeSimulationAction 
  } = useSimulationActions();
  
  const { startExitScreening, stopExitScreening } = useExitScreening();
  const { logPerformanceReport } = usePerformanceMonitoring();

  // Enhanced start simulation with candidate tracking and exit screening
  const startSimulation = useCallback(async (portfolioData: any, userSettings: any, apiKeys: any) => {
    console.log('🚀 SimulationLifecycle: Starting simulation with candidate tracking');
    
    await startSimulationAction(
      portfolioData,
      userSettings,
      initializeSimulation,
      startAISignalGenerationWithCandidates, // Use candidate-aware function
      addLogEntry,
      updateSimulationState
    );

    // Start exit screening for open positions
    if (apiKeys?.openRouter && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          userSettings.tradingStrategy,
          apiKeys,
          updateSimulationState,
          addLogEntry
        );
      }
    }

    addLogEntry('SIM', '🔄 Exit-Screening und Asset-Tracking aktiviert');
  }, [startSimulationAction, initializeSimulation, startAISignalGenerationWithCandidates, addLogEntry, updateSimulationState, startExitScreening]);

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
    console.log('🛑 SimulationLifecycle: Stopping simulation with candidate tracking');
    
    stopExitScreening();
    stopSimulationAction(
      clearTimer,
      setCurrentSignal,
      setAvailableSignals,
      stopSimulationState,
      addLogEntry
    );
    logPerformanceReport();
  }, [stopExitScreening, stopSimulationAction, clearTimer, setCurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, logPerformanceReport]);

  // Enhanced pause simulation
  const pauseSimulation = useCallback(() => {
    console.log('⏸️ SimulationLifecycle: Pausing simulation with candidate tracking');
    
    stopExitScreening();
    pauseSimulationAction(
      clearTimer,
      pauseSimulationState,
      addLogEntry
    );
  }, [stopExitScreening, pauseSimulationAction, clearTimer, pauseSimulationState, addLogEntry]);

  // Enhanced resume simulation with candidate tracking
  const resumeSimulation = useCallback(async (userSettings: any, apiKeys: any) => {
    console.log('▶️ SimulationLifecycle: Resuming simulation with candidate tracking');
    
    await resumeSimulationAction(
      resumeSimulationState,
      addLogEntry,
      startAISignalGenerationWithCandidates, // Use candidate-aware function
      updateSimulationState
    );

    // Restart exit screening
    if (apiKeys?.openRouter && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          userSettings.tradingStrategy,
          apiKeys,
          updateSimulationState,
          addLogEntry
        );
      }
    }
  }, [resumeSimulationAction, resumeSimulationState, addLogEntry, startAISignalGenerationWithCandidates, updateSimulationState, startExitScreening]);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
