
import { useState, useEffect, useCallback, useRef } from 'react';

export const useSimulationTimers = () => {
  const [aiGenerationTimer, setAiGenerationTimer] = useState<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setAiGenerationTimer(null);
      console.log('🔄 Timer cleared');
    }
  }, []);

  const updateTimerInterval = useCallback((
    isSimulationActive: boolean,
    autoMode: boolean, // Kept for compatibility but ignored
    simulationState: any,
    startAISignalGeneration: (immediate: boolean, state: any, addLogEntry: any) => Promise<void>,
    addLogEntry: (type: any, message: string) => void
  ) => {
    // Always clear existing timer first
    clearTimer();
    
    // Only start new timer if simulation is active and not paused
    if (isSimulationActive && simulationState?.isActive && !simulationState?.isPaused) {
      console.log('🔄 Starting new timer (30s interval)');
      const timer = setInterval(async () => {
        const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
        if (currentState?.isActive && !currentState?.isPaused) {
          console.log('⏰ Timer triggered - starting AI signal generation');
          await startAISignalGeneration(true, currentState, addLogEntry);
        } else {
          console.log('⏰ Timer triggered but simulation is inactive/paused');
        }
      }, 30 * 1000);
      
      timerRef.current = timer;
      setAiGenerationTimer(timer);
      console.log('✅ Timer started successfully');
    } else {
      console.log('❌ Timer not started - simulation inactive or paused');
    }
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    aiGenerationTimer,
    setAiGenerationTimer,
    updateTimerInterval,
    clearTimer
  };
};
