
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
    candidates, // Now from central useDashboardState
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
    startAISignalGenerationWithCandidates,
    availableSignals
  } = useDashboardState();

  console.log('🔄 DashboardStateManager: Central candidate management:', {
    candidatesCount: candidates.length,
    availableSignalsCount: availableSignals.length,
    candidates: candidates.map(c => ({ symbol: c.symbol, status: c.status })),
    availableSignals: availableSignals.map(s => ({ assetPair: s.assetPair, signalType: s.signalType }))
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
    candidates, // Central candidates management
    availableSignals, // Available signals from central state
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
    realTradingError,
    // AI signal generation with central candidate management
    startAISignalGenerationWithCandidates
  };
};
