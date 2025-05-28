
import { ApiKeys, UserSettings } from '@/types/appState';

export const validateApiKeys = (keys: Partial<ApiKeys>): string[] => {
  const errors: string[] = [];
  
  if (keys.kucoin) {
    if (!keys.kucoin.key || keys.kucoin.key.length < 24) {
      errors.push('KuCoin API Key muss mindestens 24 Zeichen lang sein');
    }
    if (!keys.kucoin.secret || keys.kucoin.secret.length < 32) {
      errors.push('KuCoin API Secret muss mindestens 32 Zeichen lang sein');
    }
    if (!keys.kucoin.passphrase || keys.kucoin.passphrase.length < 8) {
      errors.push('KuCoin Passphrase muss mindestens 8 Zeichen lang sein');
    }
  }
  
  if (keys.openRouter && keys.openRouter.length < 20) {
    errors.push('OpenRouter API Key scheint ungültig zu sein');
  }
  
  return errors;
};

export const validateSettings = (settings: Partial<UserSettings>, hasApiKeys: boolean): string[] => {
  const errors: string[] = [];
  
  if (settings.selectedAiModelId && !settings.selectedAiModelId.includes('/')) {
    errors.push('AI Model ID muss Provider/Model Format haben');
  }
  
  if (settings.proxyUrl && !settings.proxyUrl.match(/^(https?:\/\/|\/)/)) {
    errors.push('Proxy URL muss gültiges URL Format haben');
  }
  
  if (settings.tradingMode === 'real' && !hasApiKeys) {
    errors.push('KuCoin API-Schlüssel sind für Real-Modus erforderlich');
  }
  
  return errors;
};
