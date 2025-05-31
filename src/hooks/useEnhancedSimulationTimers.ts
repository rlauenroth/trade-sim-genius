
import { useState, useEffect, useCallback, useRef } from 'react';
import { loggingService } from '@/services/loggingService';

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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const executionLockRef = useRef<boolean>(false);
  const lastExecutionTimeRef = useRef<number[]>([]);

  // Calculate adaptive interval based on system load
  const calculateAdaptiveInterval = useCallback(() => {
    const baseInterval = 30000; // 30s base
    const executionTimes = lastExecutionTimeRef.current;
    
    if (executionTimes.length === 0) return baseInterval;
    
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    
    // If execution takes longer than 10s, increase interval
    if (avgTime > 10000) {
      const factor = Math.min(avgTime / 10000, 3); // Max 3x increase
      return Math.round(baseInterval * factor);
    }
    
    return baseInterval;
  }, []);

  // Enhanced execution wrapper with timing and lock
  const executeWithProtection = useCallback(async (
    executionFunction: () => Promise<void>,
    context: string
  ) => {
    // Check execution lock
    if (executionLockRef.current) {
      console.log(`🔒 ${context} execution blocked - already running`);
      loggingService.logEvent('SYSTEM', `${context} execution blocked - overlap protection`);
      return;
    }

    const startTime = Date.now();
    executionLockRef.current = true;

    try {
      console.log(`🚀 ${context} execution started`);
      loggingService.logEvent('SYSTEM', `${context} execution started`);
      
      await executionFunction();
      
      const executionTime = Date.now() - startTime;
      
      // Track execution times (keep last 10)
      lastExecutionTimeRef.current = [
        ...lastExecutionTimeRef.current.slice(-9),
        executionTime
      ];
      
      setTimerState(prev => ({
        ...prev,
        lastExecution: startTime,
        executionCount: prev.executionCount + 1,
        averageExecutionTime: lastExecutionTimeRef.current.reduce((a, b) => a + b, 0) / lastExecutionTimeRef.current.length
      }));
      
      console.log(`✅ ${context} execution completed in ${executionTime}ms`);
      loggingService.logEvent('SYSTEM', `${context} execution completed`, {
        executionTime,
        averageTime: timerState.averageExecutionTime
      });
      
    } catch (error) {
      console.error(`❌ ${context} execution failed:`, error);
      loggingService.logError(`${context} execution failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });
    } finally {
      executionLockRef.current = false;
    }
  }, [timerState.averageExecutionTime]);

  // Start enhanced timer with adaptive intervals
  const startEnhancedTimer = useCallback((
    isActive: boolean,
    simulationState: any,
    executionFunction: () => Promise<void>,
    context: string = 'AI Signal Generation'
  ) => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isActive || !simulationState?.isActive || simulationState?.isPaused) {
      console.log(`❌ Enhanced timer not started - ${context} conditions not met`);
      setTimerState(prev => ({ ...prev, isRunning: false }));
      return;
    }

    const interval = calculateAdaptiveInterval();
    console.log(`🔄 Starting enhanced timer with ${interval}ms interval`);
    
    setTimerState(prev => ({ ...prev, isRunning: true }));
    
    // Start timer with adaptive interval
    const intervalFunction = async () => {
      // Double-check conditions before execution
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      
      if (!currentState?.isActive || currentState?.isPaused) {
        console.log(`⏰ ${context} timer triggered but conditions changed - stopping timer`);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimerState(prev => ({ ...prev, isRunning: false }));
        }
        return;
      }

      await executeWithProtection(executionFunction, context);
      
      // Recalculate interval for next execution
      const newInterval = calculateAdaptiveInterval();
      if (newInterval !== interval && timerRef.current) {
        console.log(`🔄 Adjusting timer interval: ${interval}ms -> ${newInterval}ms`);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(intervalFunction, newInterval);
      }
    };
    
    timerRef.current = setInterval(intervalFunction, interval);
    
    loggingService.logEvent('SYSTEM', `Enhanced timer started for ${context}`, {
      interval,
      adaptiveIntervals: true
    });
    
  }, [calculateAdaptiveInterval, executeWithProtection]);

  // Stop timer with cleanup
  const stopEnhancedTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    executionLockRef.current = false;
    setTimerState(prev => ({ ...prev, isRunning: false }));
    
    console.log('🔄 Enhanced timer stopped and cleaned up');
    loggingService.logEvent('SYSTEM', 'Enhanced timer stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEnhancedTimer();
    };
  }, [stopEnhancedTimer]);

  // Force execution (for manual triggers)
  const forceExecution = useCallback(async (
    executionFunction: () => Promise<void>,
    context: string = 'Manual Trigger'
  ) => {
    await executeWithProtection(executionFunction, context);
  }, [executeWithProtection]);

  return {
    timerState,
    startEnhancedTimer,
    stopEnhancedTimer,
    forceExecution,
    isExecutionLocked: executionLockRef.current
  };
};
