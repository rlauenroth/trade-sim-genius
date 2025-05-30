
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
  startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
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

  // Enhanced start simulation with exit screening
  const startSimulation = useCallback(async (portfolioData: any, userSettings: any, apiKeys: any) => {
    await startSimulationAction(
      portfolioData,
      userSettings,
      initializeSimulation,
      startAISignalGeneration,
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

    addLogEntry('SIM', '🔄 Exit-Screening und optimiertes Risk-Management aktiviert');
  }, [startSimulationAction, initializeSimulation, startAISignalGeneration, addLogEntry, updateSimulationState, startExitScreening]);

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
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
    stopExitScreening();
    pauseSimulationAction(
      clearTimer,
      pauseSimulationState,
      addLogEntry
    );
  }, [stopExitScreening, pauseSimulationAction, clearTimer, pauseSimulationState, addLogEntry]);

  // Enhanced resume simulation
  const resumeSimulation = useCallback(async (userSettings: any, apiKeys: any) => {
    await resumeSimulationAction(
      resumeSimulationState,
      addLogEntry,
      startAISignalGeneration,
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
  }, [resumeSimulationAction, resumeSimulationState, addLogEntry, startAISignalGeneration, updateSimulationState, startExitScreening]);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
