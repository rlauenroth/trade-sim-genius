
import { ApiKeys, UserSettings, RiskLimits } from '@/types/appState';

export interface SettingsState {
  apiKeys: ApiKeys | null;
  userSettings: UserSettings;
  riskLimits: RiskLimits;
  isLoading: boolean;
  
  // Actions
  load: () => void;
  saveApiKeys: (keys: ApiKeys) => Promise<boolean>;
  saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  saveRiskLimits: (limits: Partial<RiskLimits>) => Promise<boolean>;
  clearApiKeys: () => void;
  validateApiKeys: (keys: Partial<ApiKeys>) => string[];
  validateSettings: (settings: Partial<UserSettings>) => string[];
  enableRealMode: () => Promise<boolean>;
  disableRealMode: () => void;
}
