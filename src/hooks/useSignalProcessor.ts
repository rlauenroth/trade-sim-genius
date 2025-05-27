
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

export const useSignalProcessor = () => {
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

    // Set signal for display first
    setCurrentSignal(signal);
    
    // Always execute automatically in the new version
    if (isSimulationActive && simulationState && !simulationState.isPaused) {
      addLogEntry('AUTO_TRADE', `Signal wird automatisch ausgeführt: ${signal.signalType} ${signal.assetPair}`);
      
      try {
        const success = await executeAutoTrade(signal, simulationState, updateSimulationState, addLogEntry);
        if (success) {
          addLogEntry('AUTO_TRADE', `Trade erfolgreich ausgeführt: ${signal.signalType} ${signal.assetPair}`);
          setCurrentSignal(null);
        } else {
          addLogEntry('ERROR', `Trade fehlgeschlagen: ${signal.signalType} ${signal.assetPair}`);
        }
      } catch (error) {
        addLogEntry('ERROR', `Trade-Ausführung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    } else {
      // Just show the signal for information if simulation is not active
      addLogEntry('INFO', `Signal empfangen (Simulation nicht aktiv): ${signal.signalType} ${signal.assetPair}`);
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
