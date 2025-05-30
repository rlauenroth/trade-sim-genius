
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

// Helper function to safely extract portfolio value
const getPortfolioValue = (portfolioData: any): number => {
  if (!portfolioData) {
    loggingService.logError('Portfolio data is null/undefined', { portfolioData });
    return 0;
  }

  // Try different possible property names for portfolio value
  const value = portfolioData.totalValue ?? portfolioData.totalUSDValue ?? 0;
  
  if (typeof value !== 'number' || isNaN(value)) {
    loggingService.logError('Portfolio value is not a valid number', { 
      portfolioData,
      extractedValue: value,
      valueType: typeof value
    });
    return 0;
  }

  return value;
};

// Helper function to safely get positions count
const getPositionsCount = (portfolioData: any): number => {
  if (!portfolioData?.positions) {
    return 0;
  }
  return Array.isArray(portfolioData.positions) ? portfolioData.positions.length : 0;
};

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
      // Safely extract portfolio value with defensive checks
      const portfolioValue = getPortfolioValue(portfolioData);
      const positionsCount = getPositionsCount(portfolioData);

      // Log detailed portfolio data structure for debugging
      loggingService.logEvent('SIM', 'Starting automatic simulation with portfolio analysis', {
        portfolioValue,
        positionsCount,
        portfolioDataStructure: {
          hasData: !!portfolioData,
          hasTotalValue: 'totalValue' in (portfolioData || {}),
          hasTotalUSDValue: 'totalUSDValue' in (portfolioData || {}),
          hasPositions: 'positions' in (portfolioData || {}),
          rawPortfolioData: portfolioData
        }
      });

      // Validate portfolio value before proceeding
      if (portfolioValue <= 0) {
        const errorMessage = `Invalid portfolio value: ${portfolioValue}. Cannot start simulation.`;
        loggingService.logError('Simulation start failed - invalid portfolio value', {
          portfolioValue,
          portfolioData
        });
        addLogEntry('ERROR', errorMessage);
        return;
      }

      addLogEntry('SIM', `Automatische Simulation gestartet mit Portfolio-Wert: $${portfolioValue.toFixed(2)}`);
      addLogEntry('SIM', 'Vollautomatischer Modus - Alle Signale werden automatisch ausgeführt');
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      updateSimulationState(initialState);
      
      // Start AI signal generation immediately (timer will be handled by useSimulationTimers)
      await startAISignalGeneration(true, initialState, addLogEntry);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      loggingService.logError('Automatic simulation start failed', {
        error: errorMessage,
        portfolioData,
        portfolioValue: getPortfolioValue(portfolioData)
      });
      
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${errorMessage}`);
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
