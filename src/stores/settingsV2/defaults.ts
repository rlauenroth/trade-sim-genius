
import { VerifiedSettings, SettingsBlock } from './types';

export const getDefaultSettings = (): VerifiedSettings => ({
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
    id: 'anthropic/claude-3.5-sonnet',
    provider: 'anthropic',
    priceUsdPer1k: 3.0,
    latencyMs: 2000,
    verified: false
  },
  proxyUrl: 'https://t3h.online/kucoin-proxy.php?path=',
  tradingMode: 'simulation',
  tradingStrategy: 'balanced',
  riskLimits: {
    maxOpenOrders: 5,
    maxExposure: 1000,
    minBalance: 50,
    requireConfirmation: true
  },
  lastUpdated: Date.now()
});

export const getDefaultBlocks = (): Record<string, SettingsBlock> => ({
  kucoin: {
    name: 'KuCoin API',
    verified: false,
    modified: false
  },
  openRouter: {
    name: 'OpenRouter API',
    verified: false,
    modified: false
  },
  model: {
    name: 'AI Model',
    verified: false,
    modified: false
  },
  proxy: {
    name: 'Proxy Connection',
    verified: true,
    modified: false
  },
  trading: {
    name: 'Trading Mode',
    verified: true,
    modified: false
  },
  strategy: {
    name: 'Trading Strategy',
    verified: true,
    modified: false
  }
});
