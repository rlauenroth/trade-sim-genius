
import { useCallback, useEffect, useState } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { realTradingService } from '@/services/realTrading';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

export const useRealTradingManager = () => {
  const { settings } = useSettingsV2Store();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Initialize real trading service when needed
  useEffect(() => {
    if (settings.tradingMode === 'real') {
      initializeRealTradingServices();
    } else {
      // Clean up real trading services in simulation mode
      setIsInitialized(false);
      setInitializationError(null);
    }
  }, [settings.tradingMode, settings.kucoin.key, settings.riskLimits]);

  const initializeRealTradingServices = useCallback(async () => {
    try {
      setInitializationError(null);

      // Validate essential configuration
      if (!settings.kucoin.key || !settings.kucoin.secret || !settings.kucoin.passphrase) {
        throw new Error('KuCoin API-Schlüssel nicht vollständig konfiguriert');
      }

      if (!settings.riskLimits || typeof settings.riskLimits.maxOpenOrders !== 'number') {
        throw new Error('Risk-Limits nicht korrekt konfiguriert');
      }

      // Configure real trading service
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

      setIsInitialized(true);
      
      loggingService.logSuccess('Real trading services initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setInitializationError(errorMessage);
      setIsInitialized(false);
      
      loggingService.logError('Real trading service initialization failed', {
        error: errorMessage,
        hasKucoinKeys: !!settings.kucoin.key,
        hasRiskLimits: !!settings.riskLimits
      });

      toast({
        title: "Real-Trading Initialisierung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [settings]);

  const retryInitialization = useCallback(() => {
    if (settings.tradingMode === 'real') {
      initializeRealTradingServices();
    }
  }, [initializeRealTradingServices, settings.tradingMode]);

  return {
    isInitialized,
    initializationError,
    retryInitialization,
    isRealTradingMode: settings.tradingMode === 'real'
  };
};
