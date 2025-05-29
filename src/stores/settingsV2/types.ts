
import { VerifiedSettings, SettingsBlock } from '@/types/settingsV2';

export interface SettingsV2State {
  settings: VerifiedSettings;
  blocks: Record<string, SettingsBlock>;
  isLoading: boolean;
  
  // Actions
  load: () => void;
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => void;
  markBlockModified: (blockName: string) => void;
  markBlockVerified: (blockName: string, verified: boolean) => void;
  saveSettings: () => Promise<boolean>;
  canSave: () => boolean;
  resetBlock: (blockName: string) => void;
}

export const STORAGE_KEY = 'kiTradingApp_settingsV2';

export const OLD_STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings'
};
