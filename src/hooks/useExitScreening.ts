
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { usePositionProcessor } from './usePositionProcessor';
import { useExitScreeningTimer } from './useExitScreeningTimer';
import { ApiKeys } from '@/types/appState';

export const useExitScreening = () => {
  const { processExitScreening } = usePositionProcessor();
  const { startExitScreening: startTimer, stopExitScreening: stopTimer } = useExitScreeningTimer();

  const startExitScreening = useCallback((
    simulationState: SimulationState,
    strategy: string,
    apiKeys: ApiKeys,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ) => {
    startTimer(
      simulationState,
      strategy,
      apiKeys,
      processExitScreening,
      updateSimulationState,
      addLogEntry
    );
  }, [startTimer, processExitScreening]);

  const stopExitScreening = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  return {
    startExitScreening,
    stopExitScreening,
    processExitScreening
  };
};
