
export interface UserSettings {
  tradingStrategy: 'conservative' | 'balanced' | 'aggressive';
  selectedAiModelId: string;
  theme?: 'light' | 'dark';
  language?: 'de' | 'en';
}

export interface ApiKeys {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
  openRouterApiKey: string;
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
