
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

  // Create local candidate-aware signal generation function
  const startAISignalGenerationWithCandidates = async (
    isActive: boolean,
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: any,
    updateSimulationStateParam?: any
  ) => {
    console.log('🚀 EnhancedSimulation: Starting AI signal generation with candidate integration');
    
    // Create candidate callbacks
    const candidateCallbacks = {
      addCandidate: (symbol: string, initialStatus?: any) => {
        console.log('🔄 EnhancedSimulation CALLBACK: Adding candidate:', symbol, initialStatus);
        addCandidate(symbol, initialStatus);
      },
      updateCandidateStatus: (symbol: string, status: any, signalType?: any, confidence?: number, additionalData?: any) => {
        console.log('🔄 EnhancedSimulation CALLBACK: Updating candidate status:', symbol, status);
        updateCandidateStatus(symbol, status, signalType, confidence, additionalData);
      },
      clearCandidates: () => {
        console.log('🔄 EnhancedSimulation CALLBACK: Clearing candidates');
        clearCandidates();
      },
      advanceCandidateToNextStage: (symbol: string, nextStatus: any, meta?: any) => {
        console.log('🔄 EnhancedSimulation CALLBACK: Advancing candidate:', symbol, nextStatus);
        advanceCandidateToNextStage(symbol, nextStatus, meta);
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

  // Optimized timer management effect with state comparison
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
      console.log('🔄 EnhancedSimulation: Starting timer with candidate-aware signal generation');
      
      const enhancedStartAISignalGenerationWithCandidates = async () => {
        console.log('🚀 EnhancedSimulation TIMER: Starting AI signal generation with candidates');
        await startAISignalGenerationWithCandidates(
          isSimulationActive,
          () => {}, // addLogEntry - simplified for timer
          undefined, // executeAutoTrade
          updateSimulationState
        );
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
