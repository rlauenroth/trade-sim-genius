
import { useSignalGeneration } from './ai/useSignalGeneration';
import { useCandidates } from './useCandidates';

export const useAISignals = () => {
  const {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals,
    isFetchingSignals
  } = useSignalGeneration();
  
  const { candidates } = useCandidates();

  // Enhanced signal generation with auto-execution support
  const startAISignalGeneration = async (
    isActive: boolean,
    simulationState: any,
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: (signal: any, simulationState: any, updateSimulationState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState?: (state: any) => void
  ) => {
    await generateSignals(
      isActive,
      simulationState,
      addLogEntry,
      executeAutoTrade,
      updateSimulationState
    );
  };

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    candidates,
    isFetchingSignals
  };
};
