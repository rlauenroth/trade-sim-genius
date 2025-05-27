
import { create } from 'zustand';
import { ApiKeys, UserSettings } from '@/types/appState';
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
  createdAt: Date.now()
};

interface SettingsState {
  apiKeys: ApiKeys | null;
  userSettings: UserSettings;
  isLoading: boolean;
  
  // Actions
  load: () => void;
  saveApiKeys: (keys: ApiKeys) => Promise<boolean>;
  saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  clearApiKeys: () => void;
  validateApiKeys: (keys: Partial<ApiKeys>) => string[];
  validateSettings: (settings: Partial<UserSettings>) => string[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: null,
  userSettings: DEFAULT_SETTINGS,
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
      
      // Migrate proxy URL if needed
      const migratedProxyUrl = migrateProxyUrl(userSettings.proxyUrl);
      if (migratedProxyUrl !== userSettings.proxyUrl) {
        userSettings = { ...userSettings, proxyUrl: migratedProxyUrl };
        // Save the migrated settings immediately
        localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(userSettings));
        
        toast({
          title: "Proxy-URL aktualisiert",
          description: "Die Proxy-URL wurde auf den neuen Server aktualisiert.",
        });
      }
      
      set({ 
        apiKeys, 
        userSettings,
        isLoading: false 
      });
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ 
        apiKeys: null, 
        userSettings: DEFAULT_SETTINGS,
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

  clearApiKeys: () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
    set({ apiKeys: null });
    
    toast({
      title: "API-Schlüssel gelöscht",
      description: "Alle API-Schlüssel wurden erfolgreich entfernt."
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
    
    return errors;
  }
}));

// Initialize store
if (typeof window !== 'undefined') {
  useSettingsStore.getState().load();
}
