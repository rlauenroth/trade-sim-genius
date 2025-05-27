
import { useState, useEffect, useCallback } from 'react';

export const useSimulationTimers = () => {
  const [aiGenerationTimer, setAiGenerationTimer] = useState<NodeJS.Timeout | null>(null);

  const updateTimerInterval = useCallback((
    isSimulationActive: boolean,
    autoMode: boolean,
    simulationState: any,
    startAISignalGeneration: (immediate: boolean, state: any, addLogEntry: any) => Promise<void>,
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (aiGenerationTimer && isSimulationActive) {
      // Clear existing timer
      clearInterval(aiGenerationTimer);
      
      // Set new interval based on auto mode
      const interval = autoMode ? 30 * 1000 : 15 * 60 * 1000;
      
      const timer = setInterval(async () => {
        if (simulationState?.isActive && !simulationState?.isPaused) {
          await startAISignalGeneration(true, simulationState, addLogEntry);
        }
      }, interval);
      
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
