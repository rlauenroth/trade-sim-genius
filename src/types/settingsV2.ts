
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
