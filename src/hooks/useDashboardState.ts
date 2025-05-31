
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useCentralPortfolioService } from '@/hooks/useCentralPortfolioService';
import { useAISignals } from '@/hooks/useAISignals';

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
    activityLog // Get activityLog from simulation hook instead of state
  } = useSimulation();

  // Integrate AI signals and candidates
  const {
    currentSignal,
    availableSignals,
    startAISignalGeneration,
    candidates,
    isFetchingSignals
  } = useAISignals();

  console.log('📊 useDashboardState: AI Signal data:', {
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
    currentSignal, // From AI signals
    activityLog, // From simulation hook
    candidates, // From AI signals with useCandidates integration
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
    startAISignalGeneration,
    availableSignals,
    isFetchingSignals
  };
};
