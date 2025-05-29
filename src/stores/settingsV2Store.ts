
import { create } from 'zustand';
import { VerifiedSettings, SettingsBlock } from '@/types/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';
import { KUCOIN_PROXY_BASE } from '@/config';

interface SettingsV2State {
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

const STORAGE_KEY = 'kiTradingApp_settingsV2';
const OLD_STORAGE_KEYS = {
  API_KEYS: 'kiTradingApp_apiKeys',
  USER_SETTINGS: 'kiTradingApp_userSettings'
};

const getDefaultSettings = (): VerifiedSettings => {
  const defaultModel = modelProviderService.getDefaultModel();
  const optimalProvider = defaultModel ? modelProviderService.getOptimalProvider(defaultModel.id) : null;
  
  return {
    kucoin: {
      key: '',
      secret: '',
      passphrase: '',
      verified: false
    },
    openRouter: {
      apiKey: '',
      verified: false
    },
    model: {
      id: defaultModel?.id || 'mistralai/mistral-7b-instruct',
      provider: optimalProvider?.name || 'Groq',
      priceUsdPer1k: optimalProvider?.priceUsdPer1k || 0,
      latencyMs: optimalProvider?.latencyMs || 200,
      verified: false
    },
    proxyUrl: KUCOIN_PROXY_BASE,
    lastUpdated: Date.now()
  };
};

const getDefaultBlocks = (): Record<string, SettingsBlock> => ({
  kucoin: { name: 'KuCoin', verified: false, modified: false },
  openRouter: { name: 'OpenRouter', verified: false, modified: false },
  model: { name: 'KI-Modell', verified: false, modified: false },
  proxy: { name: 'Proxy', verified: true, modified: false } // Proxy is optional, so verified by default
});

// Migration function to import old settings
const migrateFromOldSettings = (): Partial<VerifiedSettings> => {
  try {
    const oldApiKeys = localStorage.getItem(OLD_STORAGE_KEYS.API_KEYS);
    const oldUserSettings = localStorage.getItem(OLD_STORAGE_KEYS.USER_SETTINGS);
    
    const migration: Partial<VerifiedSettings> = {};
    
    if (oldApiKeys) {
      const apiKeys = JSON.parse(oldApiKeys);
      if (apiKeys.kucoinApiKey || apiKeys.kucoinApiSecret || apiKeys.kucoinApiPassphrase) {
        migration.kucoin = {
          key: apiKeys.kucoinApiKey || '',
          secret: apiKeys.kucoinApiSecret || '',
          passphrase: apiKeys.kucoinApiPassphrase || '',
          verified: false // Will need re-verification
        };
      }
      if (apiKeys.openRouterApiKey) {
        migration.openRouter = {
          apiKey: apiKeys.openRouterApiKey,
          verified: false // Will need re-verification
        };
      }
    }
    
    if (oldUserSettings) {
      const userSettings = JSON.parse(oldUserSettings);
      if (userSettings.proxyUrl) {
        migration.proxyUrl = userSettings.proxyUrl;
      }
      if (userSettings.selectedAiModelId) {
        const provider = modelProviderService.getOptimalProvider(userSettings.selectedAiModelId);
        migration.model = {
          id: userSettings.selectedAiModelId,
          provider: provider?.name || 'OpenAI',
          priceUsdPer1k: provider?.priceUsdPer1k || 0,
          latencyMs: provider?.latencyMs || 500,
          verified: false // Will need re-verification
        };
      }
    }
    
    loggingService.logEvent('API', 'Migrated settings from old format');
    return migration;
  } catch (error) {
    console.warn('Could not migrate old settings:', error);
    return {};
  }
};

export const useSettingsV2Store = create<SettingsV2State>((set, get) => ({
  settings: getDefaultSettings(),
  blocks: getDefaultBlocks(),
  isLoading: false,

  load: () => {
    set({ isLoading: true });
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let settings = getDefaultSettings();
      
      if (stored) {
        const parsed = JSON.parse(stored) as VerifiedSettings;
        settings = {
          ...settings,
          ...parsed,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
      } else {
        // Try to migrate from old settings
        const migrated = migrateFromOldSettings();
        if (Object.keys(migrated).length > 0) {
          settings = { ...settings, ...migrated };
        }
      }
      
      // Update blocks based on verification status
      const blocks = getDefaultBlocks();
      blocks.kucoin.verified = settings.kucoin.verified;
      blocks.openRouter.verified = settings.openRouter.verified;
      blocks.model.verified = settings.model.verified;
      blocks.proxy.verified = true; // Proxy is always considered verified
      
      set({ 
        settings,
        blocks,
        isLoading: false 
      });
      
      loggingService.logEvent('API', 'Settings V2 loaded successfully');
    } catch (error) {
      console.error('Error loading settings V2:', error);
      set({ 
        settings: getDefaultSettings(),
        blocks: getDefaultBlocks(),
        isLoading: false 
      });
    }
  },

  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => {
    const { settings, blocks } = get();
    const newSettings = { ...settings, ...data, lastUpdated: Date.now() };
    const newBlocks = {
      ...blocks,
      [blockName]: {
        ...blocks[blockName],
        modified: true,
        verified: false // Reset verification when modified
      }
    };
    
    set({ settings: newSettings, blocks: newBlocks });
  },

  markBlockModified: (blockName: string) => {
    const { blocks } = get();
    set({
      blocks: {
        ...blocks,
        [blockName]: {
          ...blocks[blockName],
          modified: true
        }
      }
    });
  },

  markBlockVerified: (blockName: string, verified: boolean) => {
    const { blocks, settings } = get();
    
    // Update verification status in both blocks and settings
    const newBlocks = {
      ...blocks,
      [blockName]: {
        ...blocks[blockName],
        verified
      }
    };
    
    const newSettings = { ...settings };
    if (blockName === 'kucoin') {
      newSettings.kucoin.verified = verified;
    } else if (blockName === 'openRouter') {
      newSettings.openRouter.verified = verified;
    } else if (blockName === 'model') {
      newSettings.model.verified = verified;
    }
    
    set({ blocks: newBlocks, settings: newSettings });
  },

  canSave: () => {
    const { blocks } = get();
    return Object.values(blocks).every(block => block.verified);
  },

  saveSettings: async (): Promise<boolean> => {
    const { settings, blocks, canSave } = get();
    
    if (!canSave()) {
      toast({
        title: "Validierung erforderlich",
        description: "Bitte verifizieren Sie alle Einstellungsblöcke vor dem Speichern.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      // Reset modified flags
      const newBlocks = { ...blocks };
      Object.keys(newBlocks).forEach(key => {
        newBlocks[key].modified = false;
      });
      set({ blocks: newBlocks });
      
      const modifiedBlocks = Object.keys(blocks).filter(key => blocks[key].modified);
      loggingService.logEvent('API', `Settings saved: ${modifiedBlocks.join(', ')}`);
      
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Änderungen wurden erfolgreich übernommen."
      });
      
      return true;
    } catch (error) {
      console.error('Error saving settings V2:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  },

  resetBlock: (blockName: string) => {
    const { blocks } = get();
    set({
      blocks: {
        ...blocks,
        [blockName]: {
          ...blocks[blockName],
          modified: false,
          verified: false
        }
      }
    });
  }
}));

// Initialize store
if (typeof window !== 'undefined') {
  useSettingsV2Store.getState().load();
}
