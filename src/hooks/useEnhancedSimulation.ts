
import { useEffect, useRef } from 'react';
import { useEnhancedSimulationState } from './useEnhancedSimulationState';
import { useEnhancedSignalIntegration } from './useEnhancedSignalIntegration';
import { useEnhancedSimulationLifecycle } from './useEnhancedSimulationLifecycle';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { useCandidates } from './useCandidates';
import { useAISignals } from './useAISignals';

export const useEnhancedSimulation = () => {
  const {
    simulationState,
    isSimulationActive,
    initializeSimulation,
    updateSimulationState,
    pauseSimulationState,
    resumeSimulationState,
    stopSimulationState,
    timerState,
    getStateReport,
    activityLog,
    autoModeError
  } = useEnhancedSimulationState();

  const { candidates, updateCandidateStatus, addCandidate, clearCandidates, advanceCandidateToNextStage } = useCandidates();
  const { startAISignalGeneration } = useAISignals();

  const {
    currentSignal,
    signalState,
    availableSignals,
    forceSignalReset,
    acceptSignal,
    ignoreSignal,
    setAICurrentSignal,
    setAvailableSignals
  } = useEnhancedSignalIntegration(isSimulationActive, simulationState, updateSimulationState);

  // FIXED: Create candidate-aware signal generation function with proper error handling
  const startAISignalGenerationWithCandidates = async (
    isActive: boolean,
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: any,
    updateSimulationStateParam?: any
  ) => {
    console.log('🚀 EnhancedSimulation: FIXED - Starting AI signal generation with candidate integration');
    
    try {
      // Create candidate callbacks with error handling
      const candidateCallbacks = {
        addCandidate: (symbol: string, initialStatus?: any) => {
          try {
            console.log('🔄 EnhancedSimulation CALLBACK: Adding candidate:', symbol, initialStatus);
            addCandidate(symbol, initialStatus);
          } catch (error) {
            console.error('❌ Error in addCandidate callback:', error);
            addLogEntry('ERROR', `Fehler beim Hinzufügen von Kandidat ${symbol}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
          }
        },
        updateCandidateStatus: (symbol: string, status: any, signalType?: any, confidence?: number, additionalData?: any) => {
          try {
            console.log('🔄 EnhancedSimulation CALLBACK: Updating candidate status:', symbol, status);
            updateCandidateStatus(symbol, status, signalType, confidence, additionalData);
          } catch (error) {
            console.error('❌ Error in updateCandidateStatus callback:', error);
            addLogEntry('ERROR', `Fehler beim Aktualisieren von Kandidat ${symbol}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
          }
        },
        clearCandidates: () => {
          try {
            console.log('🔄 EnhancedSimulation CALLBACK: Clearing candidates');
            clearCandidates();
          } catch (error) {
            console.error('❌ Error in clearCandidates callback:', error);
            addLogEntry('ERROR', `Fehler beim Löschen der Kandidaten: ${error instanceof Error ? error.message : 'Unbekannt'}`);
          }
        },
        advanceCandidateToNextStage: (symbol: string, nextStatus: any, meta?: any) => {
          try {
            console.log('🔄 EnhancedSimulation CALLBACK: Advancing candidate:', symbol, nextStatus);
            advanceCandidateToNextStage(symbol, nextStatus, meta);
          } catch (error) {
            console.error('❌ Error in advanceCandidateToNextStage callback:', error);
            addLogEntry('ERROR', `Fehler beim Weiterleiten von Kandidat ${symbol}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
          }
        }
      };
      
      // Call AI signal generation with candidate callbacks
      await startAISignalGeneration(
        isActive,
        simulationState,
        addLogEntry,
        executeAutoTrade,
        updateSimulationStateParam || updateSimulationState,
        candidateCallbacks
      );
    } catch (error) {
      console.error('❌ EnhancedSimulation: AI signal generation failed:', error);
      addLogEntry('ERROR', `KI-Signalgenerierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const {
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  } = useEnhancedSimulationLifecycle(
    simulationState,
    initializeSimulation,
    updateSimulationState,
    pauseSimulationState,
    resumeSimulationState,
    stopSimulationState,
    startAISignalGenerationWithCandidates, // Use local function
    forceSignalReset,
    setAICurrentSignal,
    setAvailableSignals
  );

  const {
    startEnhancedTimer,
    stopEnhancedTimer,
    forceExecution
  } = useEnhancedSimulationTimers();

  // Track previous state to prevent unnecessary timer operations
  const previousStateRef = useRef<{
    isActive: boolean;
    isPaused: boolean;
  } | null>(null);

  // FIXED: Optimized timer management effect with better state comparison and error handling
  useEffect(() => {
    const currentState = {
      isActive: isSimulationActive,
      isPaused: simulationState?.isPaused || false
    };

    // Only proceed if state actually changed
    if (previousStateRef.current) {
      const prevState = previousStateRef.current;
      if (
        prevState.isActive === currentState.isActive &&
        prevState.isPaused === currentState.isPaused
      ) {
        return; // No change, skip timer operation
      }
    }

    previousStateRef.current = currentState;

    if (isSimulationActive && !simulationState?.isPaused) {
      console.log('🔄 EnhancedSimulation: FIXED - Starting timer with candidate-aware signal generation');
      
      const enhancedStartAISignalGenerationWithCandidates = async () => {
        try {
          console.log('🚀 EnhancedSimulation TIMER: Starting AI signal generation with candidates');
          await startAISignalGenerationWithCandidates(
            isSimulationActive,
            () => {}, // addLogEntry - simplified for timer
            undefined, // executeAutoTrade
            updateSimulationState
          );
        } catch (error) {
          console.error('❌ EnhancedSimulation TIMER: Error in signal generation:', error);
        }
      };

      startEnhancedTimer(
        isSimulationActive,
        simulationState,
        enhancedStartAISignalGenerationWithCandidates,
        'Enhanced AI Generation with Candidates'
      );
    } else {
      stopEnhancedTimer();
    }
  }, [isSimulationActive, simulationState?.isPaused, startEnhancedTimer, stopEnhancedTimer]);

  // FIXED: Log current state for debugging
  console.log('🔄 EnhancedSimulation: FIXED - Current state:', {
    isSimulationActive,
    candidatesCount: candidates.length,
    availableSignalsCount: availableSignals.length,
    currentSignal: !!currentSignal,
    isPaused: simulationState?.isPaused || false
  });

  return {
    // Simulation state
    simulationState,
    isSimulationActive,
    
    // Signal state - export availableSignals for the new component
    currentSignal,
    signalState,
    availableSignals,
    candidates,
    
    // Enhanced lifecycle
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    
    // Compatibility methods
    acceptSignal,
    ignoreSignal,
    
    // Enhanced functionality
    forceSignalReset,
    manualSignalGeneration: () => forceExecution(async () => {
      await startAISignalGenerationWithCandidates(
        isSimulationActive,
        () => {},
        undefined,
        updateSimulationState
      );
    }, 'Manual Trigger with Candidates'),
    getStateReport,
    
    // Logs and monitoring
    activityLog,
    timerState,
    
    // Auto-trade error state
    autoModeError
  };
};
