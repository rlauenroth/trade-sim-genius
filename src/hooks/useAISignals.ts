
import { useSignalGeneration } from './ai/useSignalGeneration';
import { useCandidates } from './useCandidates';
import { useCentralPortfolioService } from './useCentralPortfolioService';

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
  
  // Get live portfolio data as fallback
  const { snapshot: livePortfolio } = useCentralPortfolioService();

  // Enhanced signal generation with auto-execution support and live portfolio fallback
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
      updateSimulationState,
      livePortfolio // Pass live portfolio as fallback
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
