
import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Generate unique timer ID for this hook instance
  const timerId = useMemo(() => `simulation-timer-${Math.random().toString(36).substr(2, 9)}`, []);

  // Update timer state from service
  const updateTimerState = useCallback(() => {
    const state = enhancedTimerService.getTimerState(timerId);
    setTimerState(state);
  }, [timerId]);

  // Start enhanced timer
  const startEnhancedTimer = useCallback((
    isActive: boolean,
    simulationState: any,
    executionFunction: () => Promise<void>,
    context: string = 'AI Signal Generation'
  ) => {
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
      enhancedTimerService.stopTimer(timerId);
    };
  }, [timerId]);

  // Periodic state updates
  useEffect(() => {
    const interval = setInterval(updateTimerState, 1000);
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
