
import { UserSettings } from '@/types/appState';

export const STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  SECURITY_SALT: 'kiTradingApp_securitySalt',
  USER_SETTINGS: 'kiTradingApp_userSettings',
  SIMULATION_STATE: 'kiTradingApp_simulationState',
  ACTIVITY_LOG: 'kiTradingApp_activityLog'
} as const;

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
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing user settings:', error);
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

  clearAllData: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      storageUtils.removeItem(key);
    });
  }
};
