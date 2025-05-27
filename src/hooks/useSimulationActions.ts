
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
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void,
    simulationState: SimulationState | null
  ) => {
    try {
      loggingService.logEvent('SIM', 'Starting simulation', {
        portfolioValue: portfolioData.totalUSDValue,
        availablePositions: portfolioData.positions.length,
        autoMode: userSettings.autoMode
      });

      addLogEntry('SIM', `Simulation gestartet mit Portfolio-Wert: $${portfolioData.totalUSDValue.toFixed(2)}`);
      
      if (userSettings.autoMode) {
        addLogEntry('SIM', 'Automatischer Modus aktiviert - Signale werden automatisch ausgeführt');
      }
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      
      // Start AI signal generation immediately
      await startAISignalGeneration(true, initialState, addLogEntry);
      
      // Set up periodic AI signal generation
      const interval = userSettings.autoMode ? 30 * 1000 : 15 * 60 * 1000; // 30s for auto, 15min for manual
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, interval);
      
      setAiGenerationTimer(timer);
      
    } catch (error) {
      loggingService.logError('Simulation start failed', {
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: portfolioData?.totalUSDValue
      });
      
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, []);

  const stopSimulation = useCallback((
    aiGenerationTimer: NodeJS.Timeout | null,
    setCurrentSignal: (signal: any) => void,
    setAvailableSignals: (signals: any[]) => void,
    stopSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void
  ) => {
    loggingService.logEvent('SIM', 'Stopping simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    // Clear current signals
    setCurrentSignal(null);
    setAvailableSignals([]);
    
    stopSimulationState();
    addLogEntry('SIM', 'Simulation beendet');
  }, []);

  const pauseSimulation = useCallback((
    aiGenerationTimer: NodeJS.Timeout | null,
    pauseSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void
  ) => {
    loggingService.logEvent('SIM', 'Pausing simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    pauseSimulationState();
    addLogEntry('SIM', 'Simulation pausiert');
  }, []);

  const resumeSimulation = useCallback(async (
    resumeSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    simulationState: SimulationState | null,
    startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void
  ) => {
    loggingService.logEvent('SIM', 'Resuming simulation');
    
    resumeSimulationState();
    addLogEntry('SIM', 'Simulation fortgesetzt');
    
    // Restart AI signal generation
    if (simulationState) {
      await startAISignalGeneration(true, simulationState, addLogEntry);
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, 15 * 60 * 1000);
      
      setAiGenerationTimer(timer);
    }
  }, []);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
