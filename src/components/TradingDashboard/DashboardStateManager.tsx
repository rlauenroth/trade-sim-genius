
import { useCallback, useEffect, useState } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useSimReadinessPortfolio } from '@/hooks/useSimReadinessPortfolio';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { realTradingService } from '@/services/realTradingService';
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

  // Enhanced initialization logic with proper error handling
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 DashboardStateManager: Initializing dashboard...', {
        tradingMode: settings.tradingMode,
        settingsLoading,
        isInitialized
      });

      // Skip initialization if settings are still loading
      if (settingsLoading) {
        console.log('DashboardStateManager: Waiting for settings to load...');
        return;
      }

      // Skip if already initialized
      if (isInitialized) {
        return;
      }

      try {
        // Validate essential settings
        if (!settings.kucoin.key || !settings.openRouter.apiKey) {
          throw new Error('Essential API keys missing');
        }

        // Validate risk limits for real trading mode
        if (settings.tradingMode === 'real') {
          if (!settings.riskLimits || typeof settings.riskLimits.maxOpenOrders !== 'number') {
            throw new Error('Risk limits not properly configured for real trading');
          }

          // Initialize real trading service with current settings
          try {
            const apiKeys = {
              kucoin: {
                key: settings.kucoin.key,
                secret: settings.kucoin.secret,
                passphrase: settings.kucoin.passphrase
              },
              openRouter: {
                apiKey: settings.openRouter.apiKey
              }
            };

            realTradingService.setApiKeys(apiKeys);
            realTradingService.setRiskLimits(settings.riskLimits);

            loggingService.logEvent('SIM', 'Real trading service initialized', {
              riskLimits: settings.riskLimits,
              timestamp: Date.now()
            });
          } catch (serviceError) {
            console.error('Failed to initialize real trading service:', serviceError);
            loggingService.logError('Real trading service initialization failed', {
              error: serviceError instanceof Error ? serviceError.message : 'Unknown error'
            });
            // Don't throw here - allow dashboard to load but with limited functionality
          }
        }

        console.log('✅ DashboardStateManager: Initialization successful');
        setIsInitialized(true);
        setInitializationError(null);

        loggingService.logEvent('SIM', 'Dashboard initialized successfully', {
          tradingMode: settings.tradingMode,
          hasKucoinKeys: !!settings.kucoin.key,
          hasOpenRouterKey: !!settings.openRouter.apiKey,
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

        // Show user-friendly error
        toast({
          title: "Initialisierungsfehler",
          description: `Dashboard konnte nicht initialisiert werden: ${errorMessage}`,
          variant: "destructive"
        });
      }
    };

    initializeDashboard();
  }, [settings, settingsLoading, isInitialized]);

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
    
    // Check initialization status
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
  }, [handleStartSimulationFromEffects, settings, settingsLoading, livePortfolio, isInitialized, initializationError]);

  // Enhanced manual refresh with centralized logging
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered from Dashboard (centralized)');
    
    loggingService.logInfo('Manual refresh initiated', {
      tradingMode: settings.tradingMode,
      selectedModel: settings.model.id,
      hasSimulation: isSimulationActive,
      isInitialized
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
  }, [isSimulationActive, logPerformanceReport, settings.tradingMode, settings.model.id, isInitialized]);

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
    // Expose initialization state for UI
    settingsLoading,
    isInitialized,
    initializationError
  };
};
