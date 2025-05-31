
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useCandidates } from '@/hooks/useCandidates';

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

  // Integrate candidates management directly into dashboard state
  const { candidates } = useCandidates();

  console.log('🔄 DashboardStateManager: Candidates state:', {
    candidatesCount: candidates.length,
    candidates: candidates.map(c => ({ symbol: c.symbol, status: c.status }))
  });

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
    candidates, // Now available in dashboard state
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
