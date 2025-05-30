
import { useCallback, useEffect, useState } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useSimReadinessPortfolio } from '@/hooks/useSimReadinessPortfolio';
import { useRealTradingManager } from '@/hooks/useRealTradingManager';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { serviceRegistry } from '@/services/serviceRegistry';
import { toast } from '@/hooks/use-toast';
import { loggingService } from '@/services/loggingService';

export const useDashboardStateManager = () => {
  const { settings, isLoading: settingsLoading } = useSettingsV2Store();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError,
    loadPortfolioData, 
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

  const { state: readinessState, isRunningBlocked, reason } = useSimGuard();

  // Use real trading manager for real trading mode
  const { 
    isInitialized: realTradingInitialized, 
    initializationError: realTradingError,
    retryInitialization: retryRealTradingInit,
    isRealTradingMode 
  } = useRealTradingManager();

  const {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation
  } = useTradingDashboardData(simulationState, portfolioData, isSimulationActive);

  // Enhanced initialization logic with service registry
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 DashboardStateManager: Initializing dashboard...', {
        tradingMode: settings.tradingMode,
        settingsLoading,
        isInitialized
      });

      if (settingsLoading || isInitialized) {
        return;
      }

      try {
        // Clear previous services
        serviceRegistry.clear();

        // Register core services
        await serviceRegistry.registerService(
          'portfolioService',
          async () => {
            try {
              await loadPortfolioData();
              return true;
            } catch (error) {
              loggingService.logError('Portfolio service initialization failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              return false;
            }
          },
          2
        );

        // Register real trading services only if in real mode
        if (isRealTradingMode) {
          await serviceRegistry.registerService(
            'realTradingService',
            async () => {
              // Real trading manager handles its own initialization
              return realTradingInitialized && !realTradingError;
            },
            3
          );
        }

        // Check if essential services are ready
        const essentialServices = ['portfolioService'];
        if (isRealTradingMode) {
          essentialServices.push('realTradingService');
        }

        const allServicesReady = serviceRegistry.getAllServicesReady(essentialServices);
        
        if (allServicesReady) {
          console.log('✅ DashboardStateManager: All services initialized');
          setIsInitialized(true);
          setInitializationError(null);
        } else {
          throw new Error('Essential services failed to initialize');
        }

        loggingService.logEvent('SIM', 'Dashboard initialized successfully', {
          tradingMode: settings.tradingMode,
          servicesReady: serviceRegistry.getServicesStatus().map(s => ({ name: s.name, ready: s.initialized })),
          timestamp: Date.now()
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error('❌ DashboardStateManager: Initialization failed:', error);
        
        setInitializationError(errorMessage);
        loggingService.logError('Dashboard initialization failed', {
          error: errorMessage,
          tradingMode: settings.tradingMode,
          timestamp: Date.now()
        });

        toast({
          title: "Initialisierungsfehler",
          description: `Dashboard konnte nicht initialisiert werden: ${errorMessage}`,
          variant: "destructive"
        });
      }
    };

    initializeDashboard();
  }, [settings, settingsLoading, isInitialized, loadPortfolioData, isRealTradingMode, realTradingInitialized, realTradingError]);

  // Reset initialization when trading mode changes
  useEffect(() => {
    if (!settingsLoading) {
      console.log('DashboardStateManager: Trading mode changed, resetting initialization...', {
        tradingMode: settings.tradingMode
      });
      setIsInitialized(false);
      setInitializationError(null);
    }
  }, [settings.tradingMode, settingsLoading]);

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

  const { handleStartSimulation: handleStartSimulationFromEffects, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup: false,
    decryptedApiKeys: apiKeys,
    livePortfolio,
    loadPortfolioData,
    completeFirstTimeSetup: () => {},
    startSimulation
  });

  // Enhanced start simulation with improved validation
  const handleStartSimulation = useCallback(() => {
    console.log('🚀 DashboardStateManager: Starting simulation with enhanced validation...');
    
    if (!isInitialized) {
      loggingService.logError('Cannot start simulation - dashboard not initialized', {
        initializationError,
        tradingMode: settings.tradingMode
      });
      toast({
        title: "Initialisierung erforderlich",
        description: "Dashboard wird noch initialisiert, bitte warten Sie einen Moment",
        variant: "destructive"
      });
      return;
    }

    if (initializationError) {
      toast({
        title: "Initialisierungsfehler",
        description: `Kann Simulation nicht starten: ${initializationError}`,
        variant: "destructive"
      });
      return;
    }

    // Check service readiness
    const essentialServices = ['portfolioService'];
    if (isRealTradingMode) {
      essentialServices.push('realTradingService');
    }

    if (!serviceRegistry.getAllServicesReady(essentialServices)) {
      toast({
        title: "Services nicht bereit",
        description: "Warten Sie, bis alle Services initialisiert sind",
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
  }, [handleStartSimulationFromEffects, settings, settingsLoading, livePortfolio, isInitialized, initializationError, isRealTradingMode]);

  // Enhanced manual refresh with service status check
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered from Dashboard (enhanced)');
    
    loggingService.logInfo('Manual refresh initiated', {
      tradingMode: settings.tradingMode,
      selectedModel: settings.model.id,
      hasSimulation: isSimulationActive,
      isInitialized,
      servicesStatus: serviceRegistry.getServicesStatus()
    });
    
    simReadinessStore.forceRefresh();
    
    // Retry failed services
    const failedServices = serviceRegistry.getServicesStatus().filter(s => s.error);
    failedServices.forEach(service => {
      if (service.name === 'realTradingService' && isRealTradingMode) {
        retryRealTradingInit();
      }
    });
    
    if (isSimulationActive) {
      logPerformanceReport();
    }
    
    toast({
      title: "Daten aktualisiert",
      description: "Portfolio und Services werden neu geladen",
    });
  }, [isSimulationActive, logPerformanceReport, settings.tradingMode, settings.model.id, isInitialized, isRealTradingMode, retryRealTradingInit]);

  // Simple logout function with enhanced cleanup
  const logoutAndClearData = useCallback(() => {
    console.log('🚪 Logout and clear data called (enhanced)');
    loggingService.logInfo('User logout initiated', {
      tradingMode: settings.tradingMode
    });
    
    // Clear service registry
    serviceRegistry.clear();
    
    localStorage.clear();
    window.location.reload();
  }, [settings.tradingMode]);

  // Retry service initialization
  const retryServiceInitialization = useCallback((serviceName: string) => {
    loggingService.logInfo('Retrying service initialization', { serviceName });
    
    if (serviceName === 'realTradingService' && isRealTradingMode) {
      retryRealTradingInit();
    } else if (serviceName === 'portfolioService') {
      retryLoadPortfolioData();
    }
  }, [isRealTradingMode, retryRealTradingInit, retryLoadPortfolioData]);

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
    // Enhanced state exposure
    settingsLoading,
    isInitialized,
    initializationError,
    retryServiceInitialization,
    // Real trading specific
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  };
};
