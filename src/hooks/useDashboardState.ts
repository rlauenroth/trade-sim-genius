
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useSimReadinessPortfolio } from '@/hooks/useSimReadinessPortfolio';

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

  const { snapshot: livePortfolio, isLoading: livePortfolioLoading, error: livePortfolioError } = useSimReadinessPortfolio();
  
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
    activityLog,
    candidates,
    autoModeError,
    portfolioHealthStatus,
    logPerformanceReport
  } = useSimulation();

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
    candidates,
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
    logPerformanceReport
  };
};
