
import { useEffect, useRef } from 'react';
import { useEnhancedSimulationState } from './useEnhancedSimulationState';
import { useEnhancedSignalIntegration } from './useEnhancedSignalIntegration';
import { useEnhancedSimulationLifecycle } from './useEnhancedSimulationLifecycle';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { useCandidates } from './useCandidates';

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

  const {
    currentSignal,
    signalState,
    availableSignals,
    enhancedStartAISignalGeneration,
    forceSignalReset,
    acceptSignal,
    ignoreSignal,
    setAICurrentSignal,
    setAvailableSignals
  } = useEnhancedSignalIntegration(isSimulationActive, simulationState, updateSimulationState);

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
    enhancedStartAISignalGeneration,
    forceSignalReset,
    setAICurrentSignal,
    setAvailableSignals
  );

  const {
    startEnhancedTimer,
    stopEnhancedTimer,
    forceExecution
  } = useEnhancedSimulationTimers();

  const { candidates } = useCandidates();

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
      startEnhancedTimer(
        isSimulationActive,
        simulationState,
        enhancedStartAISignalGeneration,
        'Auto Enhanced AI Generation'
      );
    } else {
      stopEnhancedTimer();
    }
  }, [isSimulationActive, simulationState?.isPaused, startEnhancedTimer, stopEnhancedTimer, enhancedStartAISignalGeneration]);

  return {
    // Simulation state
    simulationState,
    isSimulationActive,
    
    // Signal state
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
    manualSignalGeneration: () => forceExecution(enhancedStartAISignalGeneration, 'Manual Trigger'),
    getStateReport,
    
    // Logs and monitoring
    activityLog,
    timerState,
    
    // Auto-trade error state
    autoModeError
  };
};
