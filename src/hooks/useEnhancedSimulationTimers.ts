
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { enhancedTimerService } from '@/services/enhancedTimerService';

interface TimerState {
  isRunning: boolean;
  lastExecution: number;
  executionCount: number;
  averageExecutionTime: number;
}

export const useEnhancedSimulationTimers = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    lastExecution: 0,
    executionCount: 0,
    averageExecutionTime: 0
  });

  // Use stable timer ID across re-renders
  const timerIdRef = useRef<string | null>(null);
  const timerId = useMemo(() => {
    if (!timerIdRef.current) {
      timerIdRef.current = `simulation-timer-${Math.random().toString(36).substr(2, 9)}`;
    }
    return timerIdRef.current;
  }, []);

  // Track last parameters to prevent unnecessary restarts
  const lastParamsRef = useRef<{
    isActive: boolean;
    isPaused: boolean;
    context: string;
  } | null>(null);

  // Update timer state from service
  const updateTimerState = useCallback(() => {
    const state = enhancedTimerService.getTimerState(timerId);
    setTimerState(prevState => {
      // Only update if state actually changed
      if (
        prevState.isRunning !== state.isRunning ||
        prevState.executionCount !== state.executionCount
      ) {
        return state;
      }
      return prevState;
    });
  }, [timerId]);

  // Debounced timer start to prevent spam
  const startEnhancedTimer = useCallback((
    isActive: boolean,
    simulationState: any,
    executionFunction: () => Promise<void>,
    context: string = 'AI Signal Generation'
  ) => {
    const currentParams = {
      isActive,
      isPaused: simulationState?.isPaused || false,
      context
    };

    // Check if parameters actually changed
    if (lastParamsRef.current) {
      const lastParams = lastParamsRef.current;
      if (
        lastParams.isActive === currentParams.isActive &&
        lastParams.isPaused === currentParams.isPaused &&
        lastParams.context === currentParams.context
      ) {
        return; // No change, skip restart
      }
    }

    lastParamsRef.current = currentParams;

    const started = enhancedTimerService.startTimer(
      timerId,
      isActive,
      simulationState,
      executionFunction,
      context
    );
    
    if (started) {
      updateTimerState();
    }
  }, [timerId, updateTimerState]);

  // Stop timer
  const stopEnhancedTimer = useCallback(() => {
    enhancedTimerService.stopTimer(timerId);
    lastParamsRef.current = null;
    updateTimerState();
  }, [timerId, updateTimerState]);

  // Force execution
  const forceExecution = useCallback(async (
    executionFunction: () => Promise<void>,
    context: string = 'Manual Trigger'
  ) => {
    await enhancedTimerService.forceExecution(timerId, executionFunction);
    updateTimerState();
  }, [timerId, updateTimerState]);

  // Cleanup on unmount - silent cleanup
  useEffect(() => {
    return () => {
      enhancedTimerService.stopTimer(timerId, true);
    };
  }, [timerId]);

  // Less frequent state updates to reduce re-renders
  useEffect(() => {
    const interval = setInterval(updateTimerState, 5000); // Reduced from 1s to 5s
    return () => clearInterval(interval);
  }, [updateTimerState]);

  return {
    timerState,
    startEnhancedTimer,
    stopEnhancedTimer,
    forceExecution,
    isExecutionLocked: false // Service manages this internally
  };
};
