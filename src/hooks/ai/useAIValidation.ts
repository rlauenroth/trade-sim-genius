
import { useCallback } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';
import { AIValidationResult } from '@/types/aiSignalHooks';

export const useAIValidation = () => {
  const { settings } = useSettingsV2Store();

  const validateAPIKeys = useCallback((
    addLogEntry: (type: any, message: string) => void
  ): AIValidationResult => {
    const openRouterApiKey = settings.openRouter.apiKey;
    const kucoinKeys = settings.kucoin;
    const strategy = settings.tradingStrategy || 'balanced';
    
    if (!openRouterApiKey || !settings.openRouter.verified) {
      loggingService.logError('AI analysis failed - OpenRouter API key missing or not verified', {
        hasApiKey: !!openRouterApiKey,
        isVerified: settings.openRouter.verified
      });
      addLogEntry('ERROR', 'OpenRouter API-Schlüssel fehlt oder ist nicht verifiziert');
      addLogEntry('INFO', 'Bitte konfigurieren Sie die API-Schlüssel in den Einstellungen');
      return { isValid: false };
    }

    if (!kucoinKeys.key || !kucoinKeys.secret || !kucoinKeys.passphrase || !settings.kucoin.verified) {
      loggingService.logError('AI analysis failed - KuCoin API keys missing or not verified', {
        hasKey: !!kucoinKeys.key,
        hasSecret: !!kucoinKeys.secret,
        hasPassphrase: !!kucoinKeys.passphrase,
        isVerified: settings.kucoin.verified
      });
      addLogEntry('ERROR', 'KuCoin API-Schlüssel fehlen oder sind nicht verifiziert');
      addLogEntry('INFO', 'Bitte konfigurieren Sie die API-Schlüssel in den Einstellungen');
      return { isValid: false };
    }

    return {
      isValid: true,
      openRouterApiKey,
      kucoinKeys,
      strategy
    };
  }, [settings]);

  return { validateAPIKeys };
};
