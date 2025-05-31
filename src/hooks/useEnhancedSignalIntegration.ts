
import { useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { useSignalStateMachine } from './useSignalStateMachine';
import { useAISignals } from './useAISignals';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useActivityLog } from './useActivityLog';

export const useEnhancedSignalIntegration = (
  isSimulationActive: boolean,
  simulationState: any,
  updateSimulationState: (state: any) => void
) => {
  const {
    currentSignal: stateMachineSignal,
    signalState,
    processingLock,
    generateSignal,
    startProcessing,
    markExecuted,
    markFailed,
    forceClear,
    canGenerateNewSignal,
    getActionableSignal
  } = useSignalStateMachine();

  const {
    currentSignal: aiCurrentSignal,
    setCurrentSignal: setAICurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration
  } = useAISignals();

  const { executeAutoTrade } = useAutoTradeExecution();
  const { addLogEntry } = useActivityLog();

  // Enhanced AI signal generation with state machine integration
  const enhancedStartAISignalGeneration = useCallback(async () => {
    if (!canGenerateNewSignal()) {
      console.log('🔒 Signal generation blocked by state machine');
      return;
    }

    console.log('🚀 Enhanced AI signal generation started');
    addLogEntry('AI', 'Erweiterte KI-Signalanalyse gestartet...');

    try {
      await startAISignalGeneration(
        isSimulationActive,
        simulationState,
        addLogEntry,
        async (signal, currentSimulationState, updateState, logEntry) => {
          // Use state machine for signal processing
          if (generateSignal(signal)) {
            if (startProcessing()) {
              try {
                const success = await executeAutoTrade(
                  signal,
                  currentSimulationState,
                  updateState,
                  logEntry
                );
                
                if (success) {
                  markExecuted();
                  return true;
                } else {
                  markFailed('Trade execution failed');
                  return false;
                }
              } catch (error) {
                markFailed(error instanceof Error ? error.message : 'Unknown error');
                return false;
              }
            }
          }
          return false;
        },
        updateSimulationState
      );
    } catch (error) {
      console.error('❌ Enhanced AI signal generation failed:', error);
      addLogEntry('ERROR', `Erweiterte KI-Analyse fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }, [
    canGenerateNewSignal, 
    startAISignalGeneration, 
    isSimulationActive, 
    simulationState, 
    addLogEntry, 
    generateSignal, 
    startProcessing, 
    executeAutoTrade, 
    markExecuted, 
    markFailed, 
    updateSimulationState
  ]);

  // Get the current actionable signal (prioritize state machine)
  const currentSignal = getActionableSignal() || aiCurrentSignal;

  // Manual signal processing (compatibility)
  const acceptSignal = useCallback(async (signal: Signal) => {
    addLogEntry('INFO', `Signal manuell angenommen (Kompatibilitätsmodus): ${signal.signalType} ${signal.assetPair}`);
  }, [addLogEntry]);

  const ignoreSignal = useCallback((signal: Signal) => {
    addLogEntry('INFO', `Signal ignoriert (Kompatibilitätsmodus): ${signal.signalType} ${signal.assetPair}`);
    forceClear();
  }, [addLogEntry, forceClear]);

  return {
    // Signal state
    currentSignal,
    signalState,
    availableSignals,
    
    // Enhanced functionality
    enhancedStartAISignalGeneration,
    forceSignalReset: forceClear,
    
    // Compatibility methods
    acceptSignal,
    ignoreSignal,
    
    // AI signals management
    setAICurrentSignal,
    setAvailableSignals
  };
};
