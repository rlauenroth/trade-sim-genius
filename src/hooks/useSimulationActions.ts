
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

export const useSimulationActions = () => {
  const startSimulation = useCallback(async (
    portfolioData: any,
    userSettings: any,
    initializeSimulation: (data: any) => SimulationState,
    startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
    addLogEntry: (type: any, message: string) => void,
    updateSimulationState: (state: SimulationState) => void
  ) => {
    try {
      loggingService.logEvent('SIM', 'Starting automatic simulation', {
        portfolioValue: portfolioData.totalUSDValue,
        availablePositions: portfolioData.positions.length
      });

      addLogEntry('SIM', `Automatische Simulation gestartet mit Portfolio-Wert: $${portfolioData.totalUSDValue.toFixed(2)}`);
      addLogEntry('SIM', 'Vollautomatischer Modus - Alle Signale werden automatisch ausgeführt');
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      updateSimulationState(initialState);
      
      // Start AI signal generation immediately (timer will be handled by useSimulationTimers)
      await startAISignalGeneration(true, initialState, addLogEntry);
      
    } catch (error) {
      loggingService.logError('Automatic simulation start failed', {
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: portfolioData?.totalUSDValue
      });
      
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, []);

  const stopSimulation = useCallback((
    clearTimer: () => void,
    setCurrentSignal: (signal: any) => void,
    setAvailableSignals: (signals: any[]) => void,
    stopSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    loggingService.logEvent('SIM', 'Stopping automatic simulation');
    
    clearTimer();
    setCurrentSignal(null);
    setAvailableSignals([]);
    stopSimulationState();
    addLogEntry('SIM', 'Automatische Simulation beendet');
  }, []);

  const pauseSimulation = useCallback((
    clearTimer: () => void,
    pauseSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    loggingService.logEvent('SIM', 'Pausing automatic simulation');
    
    clearTimer();
    pauseSimulationState();
    addLogEntry('SIM', 'Automatische Simulation pausiert');
  }, []);

  const resumeSimulation = useCallback(async (
    resumeSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
    updateSimulationState: (state: SimulationState) => void
  ) => {
    loggingService.logEvent('SIM', 'Resuming automatic simulation');
    
    resumeSimulationState();
    addLogEntry('SIM', 'Automatische Simulation fortgesetzt');
    
    // Get current simulation state and restart AI generation (timer will be handled by useSimulationTimers)
    const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
    if (currentState) {
      await startAISignalGeneration(true, currentState, addLogEntry);
    }
  }, []);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
