
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
  // Use V2 settings store as single source of truth
  const { settings, isLoading: settingsLoading } = useSettingsV2Store();
  
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError,
    loadPortfolioData, 
    retryLoadPortfolioData 
  } = usePortfolioData();

  // Use new centralized portfolio hook
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

  // Enhanced start simulation with settings verification
  const handleStartSimulation = useCallback(() => {
    console.log('🚀 DashboardStateManager: Starting simulation with centralized settings...');
    console.log('Trading mode:', settings.tradingMode);
    console.log('Selected model:', settings.model.id);
    console.log('Live portfolio:', livePortfolio);
    
    // Verify settings are loaded
    if (settingsLoading) {
      loggingService.logError('Cannot start simulation while settings are loading', {
        settingsLoading,
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Initialisierung läuft",
        description: "Bitte warten Sie, bis die Einstellungen geladen sind",
        variant: "destructive"
      });
      return;
    }

    // Verify essential settings are available
    if (!settings.kucoin.key || !settings.openRouter.apiKey) {
      loggingService.logError('Cannot start simulation without proper API configuration', {
        hasKucoinKey: !!settings.kucoin.key,
        hasOpenRouterKey: !!settings.openRouter.apiKey,
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Konfiguration unvollständig",
        description: "API-Schlüssel müssen konfiguriert sein",
        variant: "destructive"
      });
      return;
    }
    
    try {
      handleStartSimulationFromEffects();
    } catch (error) {
      console.error('❌ Error starting simulation:', error);
      loggingService.logError('Simulation start failed in DashboardStateManager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tradingMode: settings.tradingMode,
        hasValidSettings: !settingsLoading
      });
      toast({
        title: "Simulation-Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    }
  }, [handleStartSimulationFromEffects, settings, settingsLoading, livePortfolio]);

  // Enhanced manual refresh with centralized logging
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered from Dashboard (centralized)');
    
    loggingService.logInfo('Manual refresh initiated', {
      tradingMode: settings.tradingMode,
      selectedModel: settings.model.id,
      hasSimulation: isSimulationActive
    });
    
    simReadinessStore.forceRefresh();
    
    // Log performance report on manual refresh
    if (isSimulationActive) {
      logPerformanceReport();
    }
    
    toast({
      title: "Daten aktualisiert",
      description: "Portfolio und Marktdaten werden neu geladen",
    });
  }, [isSimulationActive, logPerformanceReport, settings.tradingMode, settings.model.id]);

  // Simple logout function with centralized cleanup
  const logoutAndClearData = useCallback(() => {
    console.log('🚪 Logout and clear data called (centralized)');
    loggingService.logInfo('User logout initiated', {
      tradingMode: settings.tradingMode
    });
    localStorage.clear();
    window.location.reload();
  }, [settings.tradingMode]);

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
    portfolioHealthStatus,
    // Expose settings loading state for UI
    settingsLoading
  };
};
