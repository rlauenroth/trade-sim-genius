
import { useCallback, useRef } from 'react';
import { SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';
import { ApiKeys } from '@/types/appState';

export const useExitScreeningTimer = () => {
  const exitScreeningTimer = useRef<NodeJS.Timeout | null>(null);

  const startExitScreening = useCallback((
    simulationState: SimulationState,
    strategy: string,
    apiKeys: ApiKeys,
    processExitScreening: (
      state: SimulationState,
      strategy: string,
      apiKeys: ApiKeys,
      updateSimulationState: (state: SimulationState) => void,
      addLogEntry: (type: any, message: string) => void
    ) => Promise<void>,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    stopExitScreening();

    loggingService.logEvent('AI', 'Starting exit screening timer', {
      interval: '5 minutes',
      openPositions: simulationState.openPositions.length
    });

    console.log('🔄 Starting exit screening timer');
    exitScreeningTimer.current = setInterval(async () => {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState?.isActive && !currentState?.isPaused && currentState.openPositions?.length > 0) {
        console.log('⏰ Exit screening timer triggered');
        await processExitScreening(currentState, strategy, apiKeys, updateSimulationState, addLogEntry);
      } else {
        console.log('⏰ Exit screening timer triggered but conditions not met');
      }
    }, 5 * 60 * 1000);

    addLogEntry('EXIT_SCREENING', 'Exit-Screening Timer gestartet (5 Minuten Intervall)');
  }, []);

  const stopExitScreening = useCallback(() => {
    if (exitScreeningTimer.current) {
      clearInterval(exitScreeningTimer.current);
      exitScreeningTimer.current = null;
      console.log('🔄 Exit screening timer stopped');
      loggingService.logEvent('AI', 'Exit screening timer stopped');
    }
  }, []);

  return {
    startExitScreening,
    stopExitScreening
  };
};
