
import { VerifiedSettings, SettingsBlock } from '@/types/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import { KUCOIN_PROXY_BASE } from '@/config';

export const getDefaultSettings = (): VerifiedSettings => {
  const defaultModel = modelProviderService.getDefaultModel();
  const optimalProvider = defaultModel ? modelProviderService.getOptimalProvider(defaultModel.id) : null;
  
  return {
    kucoin: {
      key: '',
      secret: '',
      passphrase: '',
      verified: false
    },
    openRouter: {
      apiKey: '',
      verified: false
    },
    model: {
      id: defaultModel?.id || 'mistralai/mistral-7b-instruct',
      provider: optimalProvider?.name || 'Groq',
      priceUsdPer1k: optimalProvider?.priceUsdPer1k || 0,
      latencyMs: optimalProvider?.latencyMs || 200,
      verified: false
    },
    proxyUrl: KUCOIN_PROXY_BASE,
    lastUpdated: Date.now()
  };
};

export const getDefaultBlocks = (): Record<string, SettingsBlock> => ({
  kucoin: { name: 'KuCoin', verified: false, modified: false },
  openRouter: { name: 'OpenRouter', verified: false, modified: false },
  model: { name: 'KI-Modell', verified: false, modified: false },
  proxy: { name: 'Proxy', verified: true, modified: false } // Proxy is optional, so verified by default
});
