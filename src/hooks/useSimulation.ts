import { useState, useCallback, useEffect } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useTradeExecution } from './useTradeExecution';
import { useRiskManagement } from './useRiskManagement';
import { useSettingsStore } from '@/stores/settingsStore';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

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
  const { validateTradeRisk } = useRiskManagement('balanced');
  const { userSettings } = useSettingsStore();

  const [aiGenerationTimer, setAiGenerationTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoModeError, setAutoModeError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Auto-trade execution with retry logic
  const executeAutoTrade = useCallback(async (signal: Signal): Promise<boolean> => {
    if (!simulationState) return false;

    try {
      loggingService.logEvent('AUTO_TRADE', 'Auto-trade execution started', {
        assetPair: signal.assetPair,
        signalType: signal.signalType,
        confidence: signal.confidenceScore
      });

      addLogEntry('AUTO_TRADE', `AUTO-TRADE: ${signal.signalType} ${signal.assetPair} wird ausgeführt...`);

      // Validate risk before executing
      const riskValidation = validateTradeRisk(signal, simulationState);
      if (!riskValidation.isValid) {
        addLogEntry('WARNING', `AUTO-TRADE abgelehnt: ${riskValidation.reason}`);
        return false;
      }

      // Execute the trade
      const tradeResult = await executeTradeFromSignal(signal, simulationState);

      if (tradeResult.success) {
        // Update simulation state with new trade
        const updatedState = {
          ...simulationState,
          openPositions: [...(simulationState.openPositions || []), tradeResult.position],
          paperAssets: tradeResult.updatedAssets,
          autoTradeCount: (simulationState.autoTradeCount || 0) + 1,
          lastAutoTradeTime: Date.now()
        };

        updateSimulationState(updatedState);
        
        addLogEntry('AUTO_TRADE', `AUTO-TRADE erfolgreich: ${signal.signalType} ${tradeResult.position.quantity} ${signal.assetPair}`, 'AutoMode', {
          tradeData: {
            id: tradeResult.position.id,
            assetPair: signal.assetPair,
            type: signal.signalType as 'BUY' | 'SELL',
            quantity: tradeResult.position.quantity,
            price: tradeResult.position.entryPrice,
            fee: 0,
            totalValue: tradeResult.position.quantity * tradeResult.position.entryPrice,
            auto: true
          }
        });

        toast({
          title: "Auto-Trade ausgeführt",
          description: `${signal.signalType} ${signal.assetPair} automatisch ausgeführt`,
        });

        // Reset retry count on success
        setRetryCount(0);
        setAutoModeError(null);
        
        return true;
      } else {
        throw new Error(tradeResult.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      loggingService.logError('Auto-trade execution failed', {
        error: errorMessage,
        signal: signal.assetPair,
        retryCount
      });

      addLogEntry('ERROR', `AUTO-TRADE fehlgeschlagen: ${errorMessage}`);

      // Implement retry logic
      if (retryCount < 3) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        const retryDelay = Math.pow(2, newRetryCount) * 1000; // Exponential backoff
        
        setTimeout(() => {
          executeAutoTrade(signal);
        }, retryDelay);
        
        addLogEntry('WARNING', `AUTO-TRADE Retry ${newRetryCount}/3 in ${retryDelay/1000}s`);
        
        return false;
      } else {
        // Max retries reached, disable auto mode
        setAutoModeError(errorMessage);
        useSettingsStore.getState().saveSettings({ autoMode: false });
        
        toast({
          title: "Automatischer Modus gestoppt",
          description: `Nach 3 Fehlversuchen: ${errorMessage}`,
          variant: "destructive"
        });
        
        return false;
      }
    }
  }, [simulationState, validateTradeRisk, executeTradeFromSignal, updateSimulationState, addLogEntry, retryCount]);

  // Handle signal processing (auto or manual)
  const processSignal = useCallback(async (signal: Signal) => {
    if (!signal || signal.signalType === 'HOLD' || signal.signalType === 'NO_TRADE') {
      setCurrentSignal(null);
      return;
    }

    const isAutoMode = userSettings.autoMode && isSimulationActive && !simulationState?.isPaused;

    if (isAutoMode) {
      // Auto mode: execute immediately
      const success = await executeAutoTrade(signal);
      if (success) {
        setCurrentSignal(null);
      }
    } else {
      // Manual mode: show signal for user decision
      setCurrentSignal(signal);
    }
  }, [userSettings.autoMode, isSimulationActive, simulationState?.isPaused, executeAutoTrade]);

  // Start simulation with auto mode support
  const startSimulation = useCallback(async (portfolioData: any) => {
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
  }, [initializeSimulation, startAISignalGeneration, addLogEntry, simulationState, userSettings.autoMode]);

  // Update timer interval when auto mode changes
  useEffect(() => {
    if (aiGenerationTimer && isSimulationActive) {
      // Clear existing timer
      clearInterval(aiGenerationTimer);
      
      // Set new interval based on auto mode
      const interval = userSettings.autoMode ? 30 * 1000 : 15 * 60 * 1000;
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, interval);
      
      setAiGenerationTimer(timer);
    }
  }, [userSettings.autoMode]);

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

  // Accept signal manually (override auto mode)
  const acceptSignal = useCallback(async (signal: Signal) => {
    if (!simulationState) return;
    
    try {
      loggingService.logEvent('TRADE', 'Manual signal accepted', {
        assetPair: signal.assetPair,
        signalType: signal.signalType,
        confidence: signal.confidenceScore
      });
      
      addLogEntry('TRADE', `Signal manuell akzeptiert: ${signal.signalType} ${signal.assetPair}`);
      
      // Validate risk before executing
      const riskValidation = validateTradeRisk(signal, simulationState);
      if (!riskValidation.isValid) {
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
      loggingService.logError('Manual signal acceptance failed', {
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
    candidates,
    autoModeError,
    processSignal
  };
};
