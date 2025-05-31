
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useCentralPortfolioService } from '@/hooks/useCentralPortfolioService';
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
    currentSignal,
    availableSignals,
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

  console.log('📊 useDashboardState: FIXED - Centralized candidate management:', {
    currentSignal: !!currentSignal,
    availableSignalsCount: availableSignals.length,
    candidatesCount: candidates.length,
    candidates: candidates.map(c => ({ symbol: c.symbol, status: c.status })),
    livePortfolioReady: !!livePortfolio,
    portfolioValue: livePortfolio?.totalValue,
    isLoadingAny: portfolioLoading || livePortfolioLoading || settingsLoading
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

  // FIXED: Proper loading state management
  const isLoading = portfolioLoading || livePortfolioLoading || settingsLoading;
  const hasError = portfolioError || livePortfolioError;
  const hasData = livePortfolio || portfolioData;

  console.log('📊 DashboardState: FIXED - Loading state management:', {
    isLoading,
    hasError: !!hasError,
    hasData: !!hasData,
    livePortfolio: !!livePortfolio,
    totalValue: livePortfolio?.totalValue,
    errorDetails: hasError
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
    // Add AI signal functionality
    availableSignals,
    // FIXED: Consolidated loading and error states
    isLoading,
    hasError,
    hasData
  };
};
