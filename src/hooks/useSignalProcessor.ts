
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

    // Always execute automatically in new version
    if (isSimulationActive && !simulationState?.isPaused) {
      const success = await executeAutoTrade(signal, simulationState!, updateSimulationState, addLogEntry);
      if (success) {
        setCurrentSignal(null);
      }
    } else {
      // Just show the signal for information but don't wait for manual action
      setCurrentSignal(signal);
    }
  }, []);

  // These methods are kept for backward compatibility but simplified
  const acceptSignal = useCallback(async (
    signal: Signal,
    simulationState: SimulationState | null,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void
  ) => {
    // In automatic mode, this should not be called but kept for compatibility
    addLogEntry('INFO', `Signal automatisch verarbeitet: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, []);

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void
  ) => {
    // In automatic mode, signals are not ignored manually
    addLogEntry('INFO', `Signal automatisch verarbeitet: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, []);

  return {
    processSignal,
    acceptSignal,
    ignoreSignal
  };
};
