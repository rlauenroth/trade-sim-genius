
import { useEffect, useState, useCallback } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useRealTradingManager } from '@/hooks/useRealTradingManager';
import { serviceRegistry } from '@/services/serviceRegistry';
import { toast } from '@/hooks/use-toast';
import { loggingService } from '@/services/loggingService';

export const useDashboardInitialization = (loadPortfolioData: () => void) => {
  const { settings, isLoading: settingsLoading } = useSettingsV2Store();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  const { 
    isInitialized: realTradingInitialized, 
    initializationError: realTradingError,
    retryInitialization: retryRealTradingInit,
    isRealTradingMode 
  } = useRealTradingManager();

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
              // Fix: Call loadPortfolioData as function since it's a no-arg function
              loadPortfolioData();
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

  // Retry service initialization
  const retryServiceInitialization = useCallback((serviceName: string) => {
    loggingService.logInfo('Retrying service initialization', { serviceName });
    
    if (serviceName === 'realTradingService' && isRealTradingMode) {
      retryRealTradingInit();
    } else if (serviceName === 'portfolioService') {
      loadPortfolioData();
    }
  }, [isRealTradingMode, retryRealTradingInit, loadPortfolioData]);

  return {
    isInitialized,
    initializationError,
    retryServiceInitialization,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  };
};
