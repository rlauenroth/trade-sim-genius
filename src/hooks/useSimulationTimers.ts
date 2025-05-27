
import { useState, useEffect, useCallback } from 'react';

export const useSimulationTimers = () => {
  const [aiGenerationTimer, setAiGenerationTimer] = useState<NodeJS.Timeout | null>(null);

  const updateTimerInterval = useCallback((
    isSimulationActive: boolean,
    autoMode: boolean, // Kept for compatibility but ignored
    simulationState: any,
    startAISignalGeneration: (immediate: boolean, state: any, addLogEntry: any) => Promise<void>,
    addLogEntry: (type: any, message: string) => void
  ) => {
    // Clear existing timer
    if (aiGenerationTimer) {
      clearInterval(aiGenerationTimer);
      setAiGenerationTimer(null);
    }
    
    // Only start new timer if simulation is active
    if (isSimulationActive && simulationState?.isActive && !simulationState?.isPaused) {
      const timer = setInterval(async () => {
        const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
        if (currentState?.isActive && !currentState?.isPaused) {
          await startAISignalGeneration(true, currentState, addLogEntry);
        }
      }, 30 * 1000); // Always 30s for automatic mode
      
      setAiGenerationTimer(timer);
    }
  }, [aiGenerationTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiGenerationTimer) {
        clearInterval(aiGenerationTimer);
      }
    };
  }, [aiGenerationTimer]);

  return {
    aiGenerationTimer,
    setAiGenerationTimer,
    updateTimerInterval
  };
};
