
import { ApiKeys, UserSettings, RiskLimits } from '@/types/appState';
import { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_RISK_LIMITS } from './constants';
import { migrateProxyUrl } from '@/config';

export const loadApiKeys = (): ApiKeys | null => {
  try {
    const storedKeys = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return storedKeys ? JSON.parse(storedKeys) : null;
  } catch (error) {
    console.error('Error loading API keys:', error);
    return null;
  }
};

export const loadUserSettings = (): UserSettings => {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    let userSettings = storedSettings 
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      : DEFAULT_SETTINGS;
    
    // Remove autoMode if it exists (migration)
    if ('autoMode' in userSettings) {
      const { autoMode, ...settingsWithoutAutoMode } = userSettings as any;
      userSettings = settingsWithoutAutoMode;
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(userSettings));
    }
    
    // Add tradingMode if missing (migration)
    if (!userSettings.tradingMode) {
      userSettings = { ...userSettings, tradingMode: 'simulation' };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(userSettings));
    }
    
    // Migrate proxy URL if needed
    const migratedProxyUrl = migrateProxyUrl(userSettings.proxyUrl);
    if (migratedProxyUrl !== userSettings.proxyUrl) {
      userSettings = { ...userSettings, proxyUrl: migratedProxyUrl };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(userSettings));
    }
    
    return userSettings;
  } catch (error) {
    console.error('Error loading user settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const loadRiskLimits = (): RiskLimits => {
  try {
    const storedRiskLimits = localStorage.getItem('kiTradingApp_riskLimits');
    return storedRiskLimits 
      ? { ...DEFAULT_RISK_LIMITS, ...JSON.parse(storedRiskLimits) }
      : DEFAULT_RISK_LIMITS;
  } catch (error) {
    console.error('Error loading risk limits:', error);
    return DEFAULT_RISK_LIMITS;
  }
};

export const saveToStorage = (key: string, data: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
    return false;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error);
  }
};
