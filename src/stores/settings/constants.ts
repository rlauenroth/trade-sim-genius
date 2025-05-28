
import { KUCOIN_PROXY_BASE } from '@/config';
import { UserSettings, RiskLimits } from '@/types/appState';

export const STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings'
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  tradingStrategy: 'balanced',
  selectedAiModelId: 'anthropic/claude-3.5-sonnet',
  proxyUrl: KUCOIN_PROXY_BASE,
  theme: 'dark',
  language: 'de',
  tradingMode: 'simulation',
  createdAt: Date.now()
};

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxOpenOrders: 5,
  maxExposure: 1000, // $1000 max exposure
  minBalance: 50, // Keep $50 USDT minimum
  requireConfirmation: true
};
