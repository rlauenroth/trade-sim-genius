
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardState } from '@/hooks/useDashboardState';

export const useDashboardStateManager = () => {
  const {
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
  } = useDashboardState();

  const {
    isInitialized,
    initializationError,
    retryServiceInitialization,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  } = useDashboardInitialization(loadPortfolioData);

  const { state: readinessState, isRunningBlocked, reason } = useSimGuard();

  const { handleStartSimulation: handleStartSimulationFromEffects, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup: false,
    decryptedApiKeys: apiKeys,
    livePortfolio,
    loadPortfolioDataWithCredentials,
    completeFirstTimeSetup: () => {},
    startSimulation
  });

  const {
    handleStartSimulation,
    handleManualRefresh,
    logoutAndClearData
  } = useDashboardActions({
    handleStartSimulationFromEffects,
    isInitialized,
    initializationError,
    isRealTradingMode,
    isSimulationActive,
    logPerformanceReport,
    retryRealTradingInit: () => {}
  });

  return {
    userSettings,
    logoutAndClearData,
    isFirstTimeAfterSetup: false,
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
    handleStartSimulation,
    handleManualRefresh,
    getSimulationDataForLog,
    autoModeError,
    portfolioHealthStatus,
    settingsLoading,
    isInitialized,
    initializationError,
    retryServiceInitialization,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  };
};
