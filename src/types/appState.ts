
export interface UserSettings {
  tradingStrategy: 'conservative' | 'balanced' | 'aggressive';
  selectedAiModelId: string;
  proxyUrl: string;
  theme?: 'light' | 'dark';
  language?: 'de' | 'en';
  tradingMode: 'simulation' | 'real';
  createdAt: number;
}

export interface ApiKeys {
  kucoin: {
    key: string;
    secret: string;
    passphrase: string;
    permissions?: string[]; // Add permissions tracking
  };
  openRouter: string;
}

export interface AppStateData {
  isSetupComplete: boolean;
  isUnlocked: boolean;
  currentStep: number;
  isFirstTimeAfterSetup: boolean;
  userSettings: UserSettings;
  decryptedApiKeys: ApiKeys | null;
  isLoading: boolean;
}

// New types for real trading
export interface TradingModeState {
  mode: 'simulation' | 'real';
  isRealModeEnabled: boolean;
  riskLimits: RiskLimits;
}

export interface RiskLimits {
  maxOpenOrders: number;
  maxExposure: number; // USD value
  minBalance: number; // Minimum USDT balance to maintain
  requireConfirmation: boolean;
}

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  size: string;
  price?: string;
  clientOid?: string;
}

export interface OrderResponse {
  orderId: string;
  status: 'active' | 'done' | 'cancelled' | 'failed';
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  size: string;
  price?: string;
  dealFunds?: string;
  dealSize?: string;
  createdAt: number;
}
