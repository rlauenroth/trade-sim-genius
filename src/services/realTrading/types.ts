
export interface ApiKeys {
  kucoin: {
    key: string;
    secret: string;
    passphrase: string;
  };
  openRouter: {
    apiKey: string;
  };
}

export interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

export interface RiskCheckResult {
  passed: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PreTradeData {
  availableUSDT: number;
  currentOpenOrders: number;
  totalCurrentExposure: number;
  estimatedTradeValue: number;
}
