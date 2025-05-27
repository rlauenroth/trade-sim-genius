
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
      
      // Start AI signal generation immediately
      await startAISignalGeneration(true, initialState, addLogEntry);
      
      // Set up periodic AI signal generation with constant 30s interval
      const timer = setInterval(async () => {
        const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
        if (currentState?.isActive && !currentState?.isPaused) {
          await startAISignalGeneration(true, currentState, addLogEntry);
        }
      }, 30 * 1000);
      
      setAiGenerationTimer(timer);
      
    } catch (error) {
      loggingService.logError('Automatic simulation start failed', {
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
    loggingService.logEvent('SIM', 'Stopping automatic simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    setCurrentSignal(null);
    setAvailableSignals([]);
    stopSimulationState();
    addLogEntry('SIM', 'Automatische Simulation beendet');
  }, []);

  const pauseSimulation = useCallback((
    aiGenerationTimer: NodeJS.Timeout | null,
    pauseSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void
  ) => {
    loggingService.logEvent('SIM', 'Pausing automatic simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    pauseSimulationState();
    addLogEntry('SIM', 'Automatische Simulation pausiert');
  }, []);

  const resumeSimulation = useCallback(async (
    resumeSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void,
    updateSimulationState: (state: SimulationState) => void
  ) => {
    loggingService.logEvent('SIM', 'Resuming automatic simulation');
    
    resumeSimulationState();
    addLogEntry('SIM', 'Automatische Simulation fortgesetzt');
    
    // Get current simulation state and restart AI generation
    const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
    if (currentState) {
      await startAISignalGeneration(true, currentState, addLogEntry);
      
      const timer = setInterval(async () => {
        const state = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
        if (state?.isActive && !state?.isPaused) {
          await startAISignalGeneration(true, state, addLogEntry);
        }
      }, 30 * 1000);
      
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
