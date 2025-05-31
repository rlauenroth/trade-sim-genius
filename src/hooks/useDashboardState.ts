
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useCentralPortfolioService } from '@/hooks/useCentralPortfolioService';
import { useAISignals } from '@/hooks/useAISignals';
import { useCandidates } from '@/hooks/useCandidates';

export const useDashboardState = () => {
  const { settings, isLoading: settingsLoading } = useSettingsV2Store();
  
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError,
    loadPortfolioData,
    loadPortfolioDataWithCredentials,
    retryLoadPortfolioData 
  } = usePortfolioData();

  // Use central portfolio service as primary data source
  const { 
    snapshot: livePortfolio, 
    isLoading: livePortfolioLoading, 
    error: livePortfolioError,
    refresh: refreshLivePortfolio
  } = useCentralPortfolioService();
  
  const { 
    simulationState, 
    isSimulationActive, 
    startSimulation,
    stopSimulation, 
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    autoModeError,
    portfolioHealthStatus,
    logPerformanceReport,
    activityLog
  } = useSimulation();

  // Central candidates management
  const {
    candidates,
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates,
    advanceCandidateToNextStage
  } = useCandidates();

  // Integrate AI signals with central candidate management
  const {
    currentSignal,
    availableSignals,
    startAISignalGeneration,
    isFetchingSignals
  } = useAISignals();

  console.log('📊 useDashboardState: Centralized candidate management:', {
    currentSignal: !!currentSignal,
    availableSignalsCount: availableSignals.length,
    candidatesCount: candidates.length,
    isFetchingSignals,
    candidates: candidates.map(c => ({ symbol: c.symbol, status: c.status }))
  });

  const {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation
  } = useTradingDashboardData(simulationState, portfolioData, isSimulationActive);

  // Create consolidated API keys object from V2 settings (centralized)
  const apiKeys = {
    kucoinApiKey: settings.kucoin.key,
    kucoinApiSecret: settings.kucoin.secret,
    kucoinApiPassphrase: settings.kucoin.passphrase,
    openRouterApiKey: settings.openRouter.apiKey
  };

  // Create userSettings object compatible with old interface but sourced from V2 store
  const userSettings = {
    tradingMode: settings.tradingMode,
    tradingStrategy: settings.tradingStrategy,
    riskLimits: settings.riskLimits,
    openRouterApiKey: settings.openRouter.apiKey,
    proxyUrl: settings.proxyUrl,
    selectedAiModelId: settings.model.id,
    isRealTradingEnabled: settings.tradingMode === 'real',
    maxConcurrentTrades: settings.riskLimits.maxOpenOrders,
    tradeAllBalance: false,
    maxUsdPerTrade: settings.riskLimits.maxExposure
  };

  // Calculate simulation data for activity log
  const getSimulationDataForLog = () => {
    if (!simulationState || !hasValidSimulation()) return undefined;
    
    return {
      startTime: simulationState.startTime,
      endTime: !simulationState.isActive ? Date.now() : undefined,
      startValue: simulationState.startPortfolioValue,
      currentValue: simulationState.currentPortfolioValue,
      totalPnL: getTotalPnL(),
      totalPnLPercent: getTotalPnLPercentage(),
      totalTrades: simulationState.openPositions?.length || 0
    };
  };

  // Enhanced AI signal generation with central candidate management
  const startAISignalGenerationWithCandidates = async (
    isActive: boolean,
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: (signal: any, simulationState: any, updateSimulationState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState?: (state: any) => void
  ) => {
    console.log('🚀 Dashboard: Starting AI signal generation with central candidate management');
    
    // Create candidate callbacks object
    const candidateCallbacks = {
      addCandidate,
      updateCandidateStatus,
      clearCandidates,
      advanceCandidateToNextStage
    };
    
    await startAISignalGeneration(
      isActive,
      simulationState,
      addLogEntry,
      executeAutoTrade,
      updateSimulationState,
      candidateCallbacks // Pass the candidate management functions
    );
  };

  console.log('📊 DashboardState: Using central portfolio data:', {
    livePortfolio: !!livePortfolio,
    totalValue: livePortfolio?.totalValue,
    isLoading: livePortfolioLoading,
    error: livePortfolioError
  });

  return {
    userSettings,
    apiKeys,
    portfolioData,
    portfolioLoading,
    portfolioError,
    retryLoadPortfolioData,
    livePortfolio,
    livePortfolioLoading,
    livePortfolioError,
    simulationState,
    isSimulationActive,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    activityLog,
    candidates, // Central candidates from useCandidates
    // Candidate management functions
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates,
    advanceCandidateToNextStage,
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation,
    getSimulationDataForLog,
    autoModeError,
    portfolioHealthStatus,
    settingsLoading,
    loadPortfolioData,
    loadPortfolioDataWithCredentials,
    logPerformanceReport,
    // Add central portfolio refresh function
    refreshLivePortfolio,
    // Add AI signal functionality with candidate integration
    startAISignalGenerationWithCandidates,
    availableSignals,
    isFetchingSignals
  };
};
