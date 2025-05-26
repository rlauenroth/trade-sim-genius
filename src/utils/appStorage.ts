
import { UserSettings, ApiKeys } from '@/types/appState';

export const STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings',
  USER_ACKNOWLEDGED_RISK: 'kiTradingApp_userAcknowledgedRisk',
  SIMULATION_STATE: 'kiTradingApp_simulationState',
  ACTIVITY_LOG: 'kiTradingApp_activityLog'
} as const;

// Cleanup corrupted localStorage data
export const cleanupCorruptedStorage = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    if (value && value !== 'true' && value !== 'false') {
      try {
        JSON.parse(value);
      } catch (error) {
        console.warn(`Removing corrupted localStorage item: ${key}`, error);
        localStorage.removeItem(key);
      }
    }
  });
};

// Migration function for old API key format
const migrateApiKeys = (stored: any): ApiKeys | null => {
  if (!stored) return null;
  
  // If already in new format
  if (stored.kucoin && stored.openRouter !== undefined) {
    return stored;
  }
  
  // If in old flat format, migrate
  if (stored.kucoinApiKey || stored.openRouterApiKey) {
    return {
      kucoin: {
        key: stored.kucoinApiKey || '',
        secret: stored.kucoinApiSecret || '',
        passphrase: stored.kucoinApiPassphrase || ''
      },
      openRouter: stored.openRouterApiKey || ''
    };
  }
  
  return null;
};

export const storageUtils = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  getUserSettings: (): UserSettings | null => {
    const stored = storageUtils.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (!stored) return null;
    
    try {
      const parsed = JSON.parse(stored);
      // Ensure all required fields are present
      return {
        tradingStrategy: parsed.tradingStrategy || 'balanced',
        selectedAiModelId: parsed.selectedAiModelId || 'anthropic/claude-3.5-sonnet',
        proxyUrl: parsed.proxyUrl || '/images/kucoin-proxy.php?path=',
        theme: parsed.theme || 'dark',
        language: parsed.language || 'de',
        createdAt: parsed.createdAt || Date.now()
      };
    } catch (error) {
      console.error('Error parsing user settings:', error);
      storageUtils.removeItem(STORAGE_KEYS.USER_SETTINGS);
      return null;
    }
  },

  saveUserSettings: (settings: UserSettings): boolean => {
    try {
      return storageUtils.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
  },

  getApiKeys: (): ApiKeys | null => {
    const stored = storageUtils.getItem(STORAGE_KEYS.API_KEYS);
    if (!stored) return null;
    
    try {
      const parsed = JSON.parse(stored);
      return migrateApiKeys(parsed);
    } catch (error) {
      console.error('Error parsing API keys:', error);
      storageUtils.removeItem(STORAGE_KEYS.API_KEYS);
      return null;
    }
  },

  saveApiKeys: (apiKeys: ApiKeys): boolean => {
    try {
      return storageUtils.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(apiKeys));
    } catch (error) {
      console.error('Error saving API keys:', error);
      return false;
    }
  },

  clearApiKeys: (): void => {
    storageUtils.removeItem(STORAGE_KEYS.API_KEYS);
    storageUtils.removeItem(STORAGE_KEYS.USER_ACKNOWLEDGED_RISK);
  },

  hasAcknowledgedRisk: (): boolean => {
    return storageUtils.getItem(STORAGE_KEYS.USER_ACKNOWLEDGED_RISK) === 'true';
  },

  clearAllData: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      storageUtils.removeItem(key);
    });
  }
};
