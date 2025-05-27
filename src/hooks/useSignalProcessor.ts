
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useTradeExecution } from './useTradeExecution';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';

export const useSignalProcessor = () => {
  const { executeTradeFromSignal } = useTradeExecution();
  const { validateTradeRisk } = useRiskManagement('balanced');

  const processSignal = useCallback(async (
    signal: Signal,
    userSettings: any,
    isSimulationActive: boolean,
    simulationState: SimulationState | null,
    setCurrentSignal: (signal: Signal | null) => void,
    executeAutoTrade: (signal: Signal, state: SimulationState, updateState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (!signal || signal.signalType === 'HOLD' || signal.signalType === 'NO_TRADE') {
      setCurrentSignal(null);
      return;
    }

    const isAutoMode = userSettings.autoMode && isSimulationActive && !simulationState?.isPaused;

    if (isAutoMode) {
      // Auto mode: execute immediately
      const success = await executeAutoTrade(signal, simulationState!, updateSimulationState, addLogEntry);
      if (success) {
        setCurrentSignal(null);
      }
    } else {
      // Manual mode: show signal for user decision
      setCurrentSignal(signal);
    }
  }, [executeAutoTrade]);

  const acceptSignal = useCallback(async (
    signal: Signal,
    simulationState: SimulationState | null,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void
  ) => {
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
  }, [validateTradeRisk, executeTradeFromSignal]);

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void
  ) => {
    loggingService.logEvent('TRADE', 'Signal ignored', {
      assetPair: signal.assetPair,
      signalType: signal.signalType
    });
    
    addLogEntry('TRADE', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, []);

  return {
    processSignal,
    acceptSignal,
    ignoreSignal
  };
};
