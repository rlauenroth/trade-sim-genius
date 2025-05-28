
import { create } from 'zustand';
import { ApiKeys, UserSettings, RiskLimits } from '@/types/appState';
import { KUCOIN_PROXY_BASE, migrateProxyUrl } from '@/config';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings'
} as const;

const DEFAULT_SETTINGS: UserSettings = {
  tradingStrategy: 'balanced',
  selectedAiModelId: 'anthropic/claude-3.5-sonnet',
  proxyUrl: KUCOIN_PROXY_BASE,
  theme: 'dark',
  language: 'de',
  tradingMode: 'simulation',
  createdAt: Date.now()
};

const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxOpenOrders: 5,
  maxExposure: 1000, // $1000 max exposure
  minBalance: 50, // Keep $50 USDT minimum
  requireConfirmation: true
};

interface SettingsState {
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: null,
  userSettings: DEFAULT_SETTINGS,
  riskLimits: DEFAULT_RISK_LIMITS,
  isLoading: false,

  load: () => {
    set({ isLoading: true });
    
    try {
      // Load API keys
      const storedKeys = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      const apiKeys = storedKeys ? JSON.parse(storedKeys) : null;
      
      // Load user settings with migration
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
        
        toast({
          title: "Proxy-URL aktualisiert",
          description: "Die Proxy-URL wurde auf den neuen Server aktualisiert.",
        });
      }
      
      // Load risk limits
      const storedRiskLimits = localStorage.getItem('kiTradingApp_riskLimits');
      const riskLimits = storedRiskLimits 
        ? { ...DEFAULT_RISK_LIMITS, ...JSON.parse(storedRiskLimits) }
        : DEFAULT_RISK_LIMITS;
      
      set({ 
        apiKeys, 
        userSettings,
        riskLimits,
        isLoading: false 
      });
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ 
        apiKeys: null, 
        userSettings: DEFAULT_SETTINGS,
        riskLimits: DEFAULT_RISK_LIMITS,
        isLoading: false 
      });
    }
  },

  saveApiKeys: async (keys: ApiKeys): Promise<boolean> => {
    try {
      const errors = get().validateApiKeys(keys);
      if (errors.length > 0) {
        toast({
          title: "Validierungsfehler",
          description: errors.join(', '),
          variant: "destructive"
        });
        return false;
      }

      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
      set({ apiKeys: keys });
      
      toast({
        title: "API-Schlüssel gespeichert",
        description: "Ihre API-Schlüssel wurden erfolgreich gespeichert."
      });
      
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  },

  saveSettings: async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    try {
      const errors = get().validateSettings(newSettings);
      if (errors.length > 0) {
        toast({
          title: "Validierungsfehler", 
          description: errors.join(', '),
          variant: "destructive"
        });
        return false;
      }

      const merged = { ...get().userSettings, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(merged));
      set({ userSettings: merged });
      
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Änderungen wurden erfolgreich übernommen."
      });
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  },

  saveRiskLimits: async (newLimits: Partial<RiskLimits>): Promise<boolean> => {
    try {
      const merged = { ...get().riskLimits, ...newLimits };
      localStorage.setItem('kiTradingApp_riskLimits', JSON.stringify(merged));
      set({ riskLimits: merged });
      
      toast({
        title: "Risiko-Limits gespeichert",
        description: "Ihre Risiko-Einstellungen wurden aktualisiert."
      });
      
      return true;
    } catch (error) {
      console.error('Error saving risk limits:', error);
      toast({
        title: "Fehler",
        description: "Risiko-Limits konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  },

  clearApiKeys: () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
    set({ apiKeys: null });
    
    // Also disable real mode when clearing API keys
    const currentSettings = get().userSettings;
    if (currentSettings.tradingMode === 'real') {
      const updatedSettings = { ...currentSettings, tradingMode: 'simulation' as const };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(updatedSettings));
      set({ userSettings: updatedSettings });
    }
    
    toast({
      title: "API-Schlüssel gelöscht",
      description: "Alle API-Schlüssel wurden erfolgreich entfernt."
    });
  },

  enableRealMode: async (): Promise<boolean> => {
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
    const success = await get().saveSettings({ tradingMode: 'real' });
    if (success) {
      toast({
        title: "Real-Modus aktiviert",
        description: "WARNUNG: Alle Trades werden mit echtem Kapital ausgeführt!",
        variant: "destructive"
      });
    }
    
    return success;
  },

  disableRealMode: () => {
    get().saveSettings({ tradingMode: 'simulation' });
    toast({
      title: "Simulations-Modus aktiviert",
      description: "Alle Trades werden wieder simuliert."
    });
  },

  validateApiKeys: (keys: Partial<ApiKeys>): string[] => {
    const errors: string[] = [];
    
    if (keys.kucoin) {
      if (!keys.kucoin.key || keys.kucoin.key.length < 24) {
        errors.push('KuCoin API Key muss mindestens 24 Zeichen lang sein');
      }
      if (!keys.kucoin.secret || keys.kucoin.secret.length < 32) {
        errors.push('KuCoin API Secret muss mindestens 32 Zeichen lang sein');
      }
      if (!keys.kucoin.passphrase || keys.kucoin.passphrase.length < 8) {
        errors.push('KuCoin Passphrase muss mindestens 8 Zeichen lang sein');
      }
    }
    
    if (keys.openRouter && keys.openRouter.length < 20) {
      errors.push('OpenRouter API Key scheint ungültig zu sein');
    }
    
    return errors;
  },

  validateSettings: (settings: Partial<UserSettings>): string[] => {
    const errors: string[] = [];
    
    if (settings.selectedAiModelId && !settings.selectedAiModelId.includes('/')) {
      errors.push('AI Model ID muss Provider/Model Format haben');
    }
    
    if (settings.proxyUrl && !settings.proxyUrl.match(/^(https?:\/\/|\/)/)) {
      errors.push('Proxy URL muss gültiges URL Format haben');
    }
    
    if (settings.tradingMode === 'real') {
      const { apiKeys } = get();
      if (!apiKeys?.kucoin) {
        errors.push('KuCoin API-Schlüssel sind für Real-Modus erforderlich');
      }
    }
    
    return errors;
  }
}));

// Initialize store
if (typeof window !== 'undefined') {
  useSettingsStore.getState().load();
}
