
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
      loggingService.logEvent('SIM', 'Starting automatic simulation', {
        portfolioValue: portfolioData.totalUSDValue,
        availablePositions: portfolioData.positions.length
      });

      addLogEntry('SIM', `Automatische Simulation gestartet mit Portfolio-Wert: $${portfolioData.totalUSDValue.toFixed(2)}`);
      addLogEntry('SIM', 'Vollautomatischer Modus - Alle Signale werden automatisch ausgeführt');
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      
      // Start AI signal generation immediately
      await startAISignalGeneration(true, initialState, addLogEntry);
      
      // Set up periodic AI signal generation with constant 30s interval for automatic mode
      const interval = 30 * 1000; // Always 30s for automatic mode
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, interval);
      
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
    
    // Clear current signals
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
    simulationState: SimulationState | null,
    startAISignalGeneration: (immediate: boolean, state: SimulationState, addLogEntry: any) => Promise<void>,
    setAiGenerationTimer: (timer: NodeJS.Timeout | null) => void
  ) => {
    loggingService.logEvent('SIM', 'Resuming automatic simulation');
    
    resumeSimulationState();
    addLogEntry('SIM', 'Automatische Simulation fortgesetzt');
    
    // Restart AI signal generation with 30s interval
    if (simulationState) {
      await startAISignalGeneration(true, simulationState, addLogEntry);
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, 30 * 1000); // Always 30s for automatic mode
      
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
