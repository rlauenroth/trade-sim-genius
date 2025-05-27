
import { useState, useCallback, useEffect } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useTradeExecution } from './useTradeExecution';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';

export const useSimulation = () => {
  const {
    simulationState,
    isSimulationActive,
    initializeSimulation,
    updateSimulationState,
    pauseSimulation: pauseSimulationState,
    resumeSimulation: resumeSimulationState,
    stopSimulation: stopSimulationState
  } = useSimulationState();

  const {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    candidates
  } = useAISignals();

  const { activityLog, addLogEntry } = useActivityLog();
  const { executeTradeFromSignal } = useTradeExecution();
  // Fix: Provide the required strategy argument
  const { validateTradeRisk } = useRiskManagement('balanced');

  const [aiGenerationTimer, setAiGenerationTimer] = useState<NodeJS.Timeout | null>(null);

  // Start simulation with portfolio data
  const startSimulation = useCallback(async (portfolioData: any) => {
    try {
      // Fix: Use 'SIM' instead of 'SIMULATION' for loggingService
      loggingService.logEvent('SIM', 'Starting simulation', {
        portfolioValue: portfolioData.totalUSDValue,
        availablePositions: portfolioData.positions.length
      });

      // Fix: Use 'SIM' instead of 'SIMULATION' for addLogEntry
      addLogEntry('SIM', `Simulation gestartet mit Portfolio-Wert: $${portfolioData.totalUSDValue.toFixed(2)}`);
      
      // Initialize simulation state
      const initialState = initializeSimulation(portfolioData);
      
      // Start AI signal generation immediately
      await startAISignalGeneration(true, initialState, addLogEntry);
      
      // Set up periodic AI signal generation (every 15 minutes)
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, 15 * 60 * 1000); // 15 minutes
      
      setAiGenerationTimer(timer);
      
    } catch (error) {
      loggingService.logError('Simulation start failed', {
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: portfolioData?.totalUSDValue
      });
      
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [initializeSimulation, startAISignalGeneration, addLogEntry, simulationState]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    // Fix: Use 'SIM' instead of 'SIMULATION'
    loggingService.logEvent('SIM', 'Stopping simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    // Clear current signals
    setCurrentSignal(null);
    setAvailableSignals([]);
    
    stopSimulationState();
    // Fix: Use 'SIM' instead of 'SIMULATION'
    addLogEntry('SIM', 'Simulation beendet');
  }, [aiGenerationTimer, setCurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    // Fix: Use 'SIM' instead of 'SIMULATION'
    loggingService.logEvent('SIM', 'Pausing simulation');
    
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    pauseSimulationState();
    // Fix: Use 'SIM' instead of 'SIMULATION'
    addLogEntry('SIM', 'Simulation pausiert');
  }, [aiGenerationTimer, pauseSimulationState, addLogEntry]);

  // Resume simulation
  const resumeSimulation = useCallback(async () => {
    // Fix: Use 'SIM' instead of 'SIMULATION'
    loggingService.logEvent('SIM', 'Resuming simulation');
    
    resumeSimulationState();
    // Fix: Use 'SIM' instead of 'SIMULATION'
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
  }, [resumeSimulationState, addLogEntry, simulationState, startAISignalGeneration]);

  // Accept signal and execute trade
  const acceptSignal = useCallback(async (signal: Signal) => {
    if (!simulationState) return;
    
    try {
      loggingService.logEvent('TRADE', 'Signal accepted', {
        assetPair: signal.assetPair,
        signalType: signal.signalType,
        confidence: signal.confidenceScore
      });
      
      addLogEntry('TRADE', `Signal akzeptiert: ${signal.signalType} ${signal.assetPair}`);
      
      // Validate risk before executing
      const riskValidation = validateTradeRisk(signal, simulationState);
      if (!riskValidation.isValid) {
        // Fix: Use 'WARNING' instead of 'RISK'
        addLogEntry('WARNING', `Trade abgelehnt: ${riskValidation.reason}`);
        return;
      }
      
      // Execute the trade
      const tradeResult = await executeTradeFromSignal(signal, simulationState);
      
      if (tradeResult.success) {
        // Update simulation state with new trade
        updateSimulationState({
          ...simulationState,
          openPositions: [...(simulationState.openPositions || []), tradeResult.position],
          paperAssets: tradeResult.updatedAssets
        });
        
        addLogEntry('TRADE', `Trade ausgeführt: ${signal.signalType} ${tradeResult.position.quantity} ${signal.assetPair}`);
      } else {
        addLogEntry('ERROR', `Trade fehlgeschlagen: ${tradeResult.error}`);
      }
      
      // Clear current signal after handling
      setCurrentSignal(null);
      
    } catch (error) {
      loggingService.logError('Signal acceptance failed', {
        error: error instanceof Error ? error.message : 'unknown',
        signal: signal.assetPair
      });
      
      addLogEntry('ERROR', `Signal-Verarbeitung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [simulationState, validateTradeRisk, executeTradeFromSignal, updateSimulationState, addLogEntry, setCurrentSignal]);

  // Ignore signal
  const ignoreSignal = useCallback((signal: Signal) => {
    loggingService.logEvent('TRADE', 'Signal ignored', {
      assetPair: signal.assetPair,
      signalType: signal.signalType
    });
    
    addLogEntry('TRADE', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, [addLogEntry, setCurrentSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiGenerationTimer) {
        clearInterval(aiGenerationTimer);
      }
    };
  }, [aiGenerationTimer]);

  return {
    simulationState,
    isSimulationActive,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    availableSignals,
    activityLog,
    candidates
  };
};
