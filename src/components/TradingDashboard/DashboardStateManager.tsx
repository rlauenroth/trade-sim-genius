
import { useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useSimReadinessPortfolio } from '@/hooks/useSimReadinessPortfolio';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { toast } from '@/hooks/use-toast';

export const useDashboardStateManager = () => {
  const { 
    userSettings, 
    logoutAndClearData: originalLogoutAndClearData, 
    isFirstTimeAfterSetup, 
    completeFirstTimeSetup, 
    apiKeys 
  } = useAppState();
  
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError,
    loadPortfolioData, 
    retryLoadPortfolioData 
  } = usePortfolioData();

  // Use new centralized portfolio hook instead of usePortfolioLive
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

  const { state: readinessState, isRunningBlocked, reason } = useSimGuard();

  const {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation
  } = useTradingDashboardData(simulationState, portfolioData, isSimulationActive);

  // Wrap logoutAndClearData to match expected signature
  const logoutAndClearData = useCallback(() => {
    originalLogoutAndClearData();
  }, [originalLogoutAndClearData]);

  const { handleStartSimulation: handleStartSimulationFromEffects, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup,
    decryptedApiKeys: apiKeys,
    livePortfolio, // Changed from portfolioData to livePortfolio
    loadPortfolioData,
    completeFirstTimeSetup,
    startSimulation
  });

  // Use the handleStartSimulation from effects which has the correct signature
  const handleStartSimulation = useCallback(() => {
    handleStartSimulationFromEffects();
  }, [handleStartSimulationFromEffects]);

  // Add handler for manual refresh with performance report
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered from Dashboard');
    simReadinessStore.forceRefresh();
    
    // Log performance report on manual refresh
    if (isSimulationActive) {
      logPerformanceReport();
    }
    
    toast({
      title: "Daten aktualisiert",
      description: "Portfolio und Marktdaten werden neu geladen",
    });
  }, [isSimulationActive, logPerformanceReport]);

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
    logoutAndClearData,
    isFirstTimeAfterSetup,
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
    portfolioHealthStatus
  };
};
