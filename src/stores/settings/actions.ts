
import { ApiKeys, UserSettings, RiskLimits } from '@/types/appState';
import { STORAGE_KEYS } from './constants';
import { validateApiKeys, validateSettings } from './validation';
import { saveToStorage, removeFromStorage } from './storage';
import { toast } from '@/hooks/use-toast';

export const createSaveApiKeysAction = (get: () => any, set: (partial: any) => void) => {
  return async (keys: ApiKeys): Promise<boolean> => {
    try {
      const errors = validateApiKeys(keys);
      if (errors.length > 0) {
        toast({
          title: "Validierungsfehler",
          description: errors.join(', '),
          variant: "destructive"
        });
        return false;
      }

      const success = saveToStorage(STORAGE_KEYS.API_KEYS, keys);
      if (success) {
        set({ apiKeys: keys });
        toast({
          title: "API-Schlüssel gespeichert",
          description: "Ihre API-Schlüssel wurden erfolgreich gespeichert."
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  };
};

export const createSaveSettingsAction = (get: () => any, set: (partial: any) => void) => {
  return async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    try {
      const state = get();
      const errors = validateSettings(newSettings, !!state.apiKeys?.kucoin);
      if (errors.length > 0) {
        toast({
          title: "Validierungsfehler", 
          description: errors.join(', '),
          variant: "destructive"
        });
        return false;
      }

      const merged = { ...state.userSettings, ...newSettings };
      const success = saveToStorage(STORAGE_KEYS.USER_SETTINGS, merged);
      if (success) {
        set({ userSettings: merged });
        toast({
          title: "Einstellungen gespeichert",
          description: "Ihre Änderungen wurden erfolgreich übernommen."
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  };
};

export const createSaveRiskLimitsAction = (get: () => any, set: (partial: any) => void) => {
  return async (newLimits: Partial<RiskLimits>): Promise<boolean> => {
    try {
      const state = get();
      const merged = { ...state.riskLimits, ...newLimits };
      const success = saveToStorage('kiTradingApp_riskLimits', merged);
      if (success) {
        set({ riskLimits: merged });
        toast({
          title: "Risiko-Limits gespeichert",
          description: "Ihre Risiko-Einstellungen wurden aktualisiert."
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error saving risk limits:', error);
      toast({
        title: "Fehler",
        description: "Risiko-Limits konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  };
};

export const createClearApiKeysAction = (get: () => any, set: (partial: any) => void) => {
  return () => {
    removeFromStorage(STORAGE_KEYS.API_KEYS);
    
    const state = get();
    // Also disable real mode when clearing API keys
    if (state.userSettings.tradingMode === 'real') {
      const updatedSettings = { ...state.userSettings, tradingMode: 'simulation' as const };
      saveToStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
      set({ apiKeys: null, userSettings: updatedSettings });
    } else {
      set({ apiKeys: null });
    }
    
    toast({
      title: "API-Schlüssel gelöscht",
      description: "Alle API-Schlüssel wurden erfolgreich entfernt."
    });
  };
};

export const createEnableRealModeAction = (get: () => any, saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>) => {
  return async (): Promise<boolean> => {
    const { apiKeys } = get();
    
    // Validate API keys have trading permissions
    if (!apiKeys?.kucoin) {
      toast({
        title: "Fehler",
        description: "KuCoin API-Schlüssel sind erforderlich für den Real-Modus.",
        variant: "destructive"
      });
      return false;
    }
    
    // Update settings
    const success = await saveSettings({ tradingMode: 'real' });
    if (success) {
      toast({
        title: "Real-Modus aktiviert",
        description: "WARNUNG: Alle Trades werden mit echtem Kapital ausgeführt!",
        variant: "destructive"
      });
    }
    
    return success;
  };
};

export const createDisableRealModeAction = (saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>) => {
  return () => {
    saveSettings({ tradingMode: 'simulation' });
    toast({
      title: "Simulations-Modus aktiviert",
      description: "Alle Trades werden wieder simuliert."
    });
  };
};
