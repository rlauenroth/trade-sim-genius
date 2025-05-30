
import { ApiKeys, KuCoinCredentials } from './types';
import { RiskLimits } from '@/types/appState';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

export class ConfigService {
  private static instance: ConfigService;
  
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  getSettingsFromStore(): { apiKeys: ApiKeys, riskLimits: RiskLimits } {
    try {
      const { settings } = useSettingsV2Store.getState();
      
      const apiKeys: ApiKeys = {
        kucoin: {
          key: settings.kucoin.key,
          secret: settings.kucoin.secret,
          passphrase: settings.kucoin.passphrase
        },
        openRouter: {
          apiKey: settings.openRouter.apiKey
        }
      };
      
      const riskLimits: RiskLimits = settings.riskLimits;
      
      return { apiKeys, riskLimits };
    } catch (error) {
      loggingService.logError('Failed to get settings from store', { 
        error: error instanceof Error ? error.message : 'unknown' 
      });
      throw new Error('Configuration not available');
    }
  }

  convertApiKeys(apiKeys: ApiKeys): KuCoinCredentials {
    return {
      kucoinApiKey: apiKeys.kucoin.key,
      kucoinApiSecret: apiKeys.kucoin.secret,
      kucoinApiPassphrase: apiKeys.kucoin.passphrase
    };
  }

  validateConfiguration(apiKeys: ApiKeys | null, riskLimits: RiskLimits): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!apiKeys) {
      errors.push('API keys not configured');
    } else {
      if (!apiKeys.kucoin?.key) errors.push('KuCoin API key missing');
      if (!apiKeys.kucoin?.secret) errors.push('KuCoin API secret missing');
      if (!apiKeys.kucoin?.passphrase) errors.push('KuCoin API passphrase missing');
    }
    
    if (!riskLimits || typeof riskLimits.maxOpenOrders !== 'number') {
      errors.push('Risk limits not properly configured');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
