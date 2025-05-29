
import { useCallback } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useSimReadinessPortfolio } from '@/hooks/useSimReadinessPortfolio';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { toast } from '@/hooks/use-toast';
import { loggingService } from '@/services/loggingService';

export const useDashboardStateManager = () => {
  // Use V2 settings store instead of old useAppState
  const { settings } = useSettingsV2Store();
  
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

  // Create a simplified API keys object from V2 settings
  const apiKeys = {
    kucoinApiKey: settings.kucoin.key,
    kucoinApiSecret: settings.kucoin.secret,
    kucoinApiPassphrase: settings.kucoin.passphrase,
    openRouterApiKey: settings.openRouter.apiKey
  };

  // Create userSettings object compatible with old interface
  const userSettings = {
    tradingMode: settings.tradingMode,
    tradingStrategy: settings.tradingStrategy,
    riskLimits: settings.riskLimits,
    openRouterApiKey: settings.openRouter.apiKey,
    proxyUrl: settings.proxyUrl,
    selectedAiModelId: settings.model.id,
    isRealTradingEnabled: settings.tradingMode === 'real',
    maxConcurrentTrades: settings.riskLimits.maxOpenOrders,
    tradeAllBalance: false, // Default value
    maxUsdPerTrade: settings.riskLimits.maxExposure
  };

  const { handleStartSimulation: handleStartSimulationFromEffects, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup: false, // Simplified for now
    decryptedApiKeys: apiKeys,
    livePortfolio,
    loadPortfolioData,
    completeFirstTimeSetup: () => {}, // Simplified
    startSimulation
  });

  // Use the handleStartSimulation from effects which has the correct signature
  const handleStartSimulation = useCallback(() => {
    console.log('🚀 DashboardStateManager: Starting simulation...');
    console.log('Trading mode:', settings.tradingMode);
    console.log('Live portfolio:', livePortfolio);
    
    try {
      handleStartSimulationFromEffects();
    } catch (error) {
      console.error('❌ Error starting simulation:', error);
      loggingService.logError('Simulation start failed in DashboardStateManager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Simulation-Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    }
  }, [handleStartSimulationFromEffects, settings.tradingMode, livePortfolio]);

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

  // Simple logout function
  const logoutAndClearData = useCallback(() => {
    console.log('🚪 Logout and clear data called');
    localStorage.clear();
    window.location.reload();
  }, []);

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
    isFirstTimeAfterSetup: false, // Simplified
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
