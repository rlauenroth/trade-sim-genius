
export interface UserSettings {
  tradingStrategy: 'conservative' | 'balanced' | 'aggressive';
  selectedAiModelId: string;
  proxyUrl: string;
  theme?: 'light' | 'dark';
  language?: 'de' | 'en';
  autoMode?: boolean;
  createdAt: number;
}

export interface ApiKeys {
  kucoin: {
    key: string;
    secret: string;
    passphrase: string;
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
