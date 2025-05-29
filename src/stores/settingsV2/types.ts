
export interface VerifiedSettings {
  kucoin: {
    key: string;
    secret: string;
    passphrase: string;
    verified: boolean;
  };
  openRouter: {
    apiKey: string;
    verified: boolean;
  };
  model: {
    id: string;
    provider: string;
    priceUsdPer1k: number;
    latencyMs: number;
    verified: boolean;
  };
  proxyUrl: string;
  tradingMode: 'simulation' | 'real';
  riskLimits: {
    maxOpenOrders: number;
    maxExposure: number;
    minBalance: number;
    requireConfirmation: boolean;
  };
  lastUpdated: number;
}

export interface ModelProvider {
  name: string;
  priceUsdPer1k: number;
  latencyMs: number;
  endpoint: string;
}

export interface ModelDefinition {
  id: string;
  name: string;
  providers: ModelProvider[];
  description: string;
  isDefault?: boolean;
}

export interface ModelProvidersConfig {
  models: ModelDefinition[];
}

export type VerificationStatus = 'untested' | 'testing' | 'success' | 'error';

export interface VerificationResult {
  status: VerificationStatus;
  message?: string;
  latencyMs?: number;
}

export interface SettingsBlock {
  name: string;
  verified: boolean;
  modified: boolean;
}

export interface SettingsV2State {
  settings: VerifiedSettings;
  blocks: Record<string, SettingsBlock>;
  isLoading: boolean;
  load: () => void;
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => void;
  markBlockModified: (blockName: string) => void;
  markBlockVerified: (blockName: string, verified: boolean) => void;
  canSave: () => boolean;
  saveSettings: () => Promise<boolean>;
  resetBlock: (blockName: string) => void;
}

export const STORAGE_KEY = 'kiTradingApp_settingsV2';

export const OLD_STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings'
};
