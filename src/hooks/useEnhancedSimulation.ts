
import { useEffect, useRef } from 'react';
import { useEnhancedSimulationState } from './useEnhancedSimulationState';
import { useEnhancedSignalIntegration } from './useEnhancedSignalIntegration';
import { useEnhancedSimulationLifecycle } from './useEnhancedSimulationLifecycle';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { useCandidates } from './useCandidates';
import { useDashboardState } from './useDashboardState';

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

  // Use the centralized dashboard state for candidate management
  const { startAISignalGenerationWithCandidates } = useDashboardState();

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
    startAISignalGenerationWithCandidates, // Use the new function with candidate integration
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

  // Enhanced timer with candidate-aware signal generation
  const enhancedStartAISignalGenerationWithCandidates = async () => {
    console.log('🚀 EnhancedSimulation: Starting AI signal generation with candidate integration');
    // This will use the centralized function that properly handles candidates
    await startAISignalGenerationWithCandidates(
      isSimulationActive,
      () => {}, // addLogEntry - will be handled internally
      undefined, // executeAutoTrade - will be handled internally
      updateSimulationState
    );
  };

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
      startEnhancedTimer(
        isSimulationActive,
        simulationState,
        enhancedStartAISignalGenerationWithCandidates, // Use the candidate-aware function
        'Enhanced AI Generation with Candidates'
      );
    } else {
      stopEnhancedTimer();
    }
  }, [isSimulationActive, simulationState?.isPaused, startEnhancedTimer, stopEnhancedTimer, startAISignalGenerationWithCandidates]);

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
    manualSignalGeneration: () => forceExecution(enhancedStartAISignalGenerationWithCandidates, 'Manual Trigger with Candidates'),
    getStateReport,
    
    // Logs and monitoring
    activityLog,
    timerState,
    
    // Auto-trade error state
    autoModeError
  };
};
