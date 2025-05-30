
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
      console.log('🔄 Signal cleared - no action needed:', signal?.signalType);
      setCurrentSignal(null);
      return;
    }

    console.log('🎯 Processing signal:', {
      assetPair: signal.assetPair,
      signalType: signal.signalType,
      isSimulationActive,
      isPaused: simulationState?.isPaused
    });

    // Set signal for display first
    setCurrentSignal(signal);
    
    // Always execute automatically in the new version
    if (isSimulationActive && simulationState && !simulationState.isPaused) {
      addLogEntry('AUTO_TRADE', `Signal wird automatisch ausgeführt: ${signal.signalType} ${signal.assetPair}`);
      
      try {
        console.log('🚀 Executing auto-trade for signal:', signal.assetPair);
        const success = await executeAutoTrade(signal, simulationState, updateSimulationState, addLogEntry);
        
        if (success) {
          addLogEntry('AUTO_TRADE', `Trade erfolgreich ausgeführt: ${signal.signalType} ${signal.assetPair}`);
          setCurrentSignal(null);
          console.log('✅ Auto-trade completed successfully, signal cleared');
        } else {
          addLogEntry('ERROR', `Trade fehlgeschlagen: ${signal.signalType} ${signal.assetPair}`);
          console.log('❌ Auto-trade failed');
        }
      } catch (error) {
        console.error('❌ Auto-trade execution error:', error);
        addLogEntry('ERROR', `Trade-Ausführung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    } else {
      // Just show the signal for information if simulation is not active
      console.log('ℹ️ Signal displayed but not executed - simulation not active');
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
    console.log('🔄 Signal automatically processed (compatibility mode)');
    addLogEntry('INFO', `Signal automatisch verarbeitet: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, []);

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void
  ) => {
    // In automatic mode, signals are not ignored manually
    console.log('🔄 Signal automatically processed (ignore compatibility mode)');
    addLogEntry('INFO', `Signal automatisch verarbeitet: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
  }, []);

  return {
    processSignal,
    acceptSignal,
    ignoreSignal
  };
};
