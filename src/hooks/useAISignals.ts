
import { useSignalGeneration } from './ai/useSignalGeneration';
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
  
  // Get live portfolio data as fallback
  const { snapshot: livePortfolio } = useCentralPortfolioService();

  // Enhanced signal generation with auto-execution support, live portfolio fallback, and candidate callbacks
  const startAISignalGeneration = async (
    isActive: boolean,
    simulationState: any,
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: (signal: any, simulationState: any, updateSimulationState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState?: (state: any) => void,
    candidateCallbacks?: {
      addCandidate: (symbol: string, initialStatus?: any) => void;
      updateCandidateStatus: (symbol: string, status: any, signalType?: any, confidence?: number, additionalData?: any) => void;
      clearCandidates: () => void;
      advanceCandidateToNextStage: (symbol: string, nextStatus: any, meta?: any) => void;
    }
  ) => {
    console.log('🚀 useAISignals: Starting signal generation with candidate callbacks:', {
      hasCandidateCallbacks: !!candidateCallbacks,
      hasLivePortfolio: !!livePortfolio
    });

    await generateSignals(
      isActive,
      simulationState,
      addLogEntry,
      executeAutoTrade,
      updateSimulationState,
      livePortfolio, // Pass live portfolio as fallback
      candidateCallbacks // Pass candidate callbacks for real-time updates
    );
  };

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    isFetchingSignals
  };
};
