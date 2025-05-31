
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
    startAISignalGenerationWithCandidates: (isActive: boolean, addLogEntry: any, executeAutoTrade?: any, updateSimulationState?: any) => Promise<void>,
    addLogEntry: (type: any, message: string) => void,
    updateSimulationState: (state: SimulationState) => void
  ) => {
    try {
      // Safely extract portfolio value with defensive checks
      const portfolioValue = getPortfolioValue(portfolioData);
      const positionsCount = getPositionsCount(portfolioData);

      // Log detailed portfolio data structure for debugging
      loggingService.logEvent('SIM', 'Starting automatic simulation with candidate tracking', {
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

      addLogEntry('SIM', `Automatische Simulation mit Kandidaten-Verfolgung gestartet - Portfolio-Wert: $${portfolioValue.toFixed(2)}`);
      addLogEntry('SIM', 'Vollautomatischer Modus mit Asset-Tracking - Alle Signale werden automatisch ausgeführt');
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      updateSimulationState(initialState);
      
      // Start AI signal generation with candidate tracking immediately
      console.log('🚀 SimulationActions: Starting AI signal generation with candidate tracking');
      await startAISignalGenerationWithCandidates(true, addLogEntry, undefined, updateSimulationState);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      loggingService.logError('Automatic simulation with candidate tracking start failed', {
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
    loggingService.logEvent('SIM', 'Stopping automatic simulation with candidate tracking');
    
    clearTimer();
    setCurrentSignal(null);
    setAvailableSignals([]);
    stopSimulationState();
    addLogEntry('SIM', 'Automatische Simulation mit Kandidaten-Verfolgung beendet');
  }, []);

  const pauseSimulation = useCallback((
    clearTimer: () => void,
    pauseSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    loggingService.logEvent('SIM', 'Pausing automatic simulation with candidate tracking');
    
    clearTimer();
    pauseSimulationState();
    addLogEntry('SIM', 'Automatische Simulation mit Kandidaten-Verfolgung pausiert');
  }, []);

  const resumeSimulation = useCallback(async (
    resumeSimulationState: () => void,
    addLogEntry: (type: any, message: string) => void,
    startAISignalGenerationWithCandidates: (isActive: boolean, addLogEntry: any, executeAutoTrade?: any, updateSimulationState?: any) => Promise<void>,
    updateSimulationState: (state: SimulationState) => void
  ) => {
    loggingService.logEvent('SIM', 'Resuming automatic simulation with candidate tracking');
    
    resumeSimulationState();
    addLogEntry('SIM', 'Automatische Simulation mit Kandidaten-Verfolgung fortgesetzt');
    
    // Get current simulation state and restart AI generation with candidate tracking
    const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
    if (currentState) {
      console.log('🚀 SimulationActions RESUME: Starting AI signal generation with candidate tracking');
      await startAISignalGenerationWithCandidates(true, addLogEntry, undefined, updateSimulationState);
    }
  }, []);

  return {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  };
};
