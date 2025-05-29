
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
const migrateFromOldSettings = (): { settings: Partial<VerifiedSettings>, shouldMarkVerified: boolean } => {
  try {
    const oldApiKeys = localStorage.getItem(OLD_STORAGE_KEYS.API_KEYS);
    const oldUserSettings = localStorage.getItem(OLD_STORAGE_KEYS.USER_SETTINGS);
    
    const migration: Partial<VerifiedSettings> = {};
    let hasKucoinData = false;
    let hasOpenRouterData = false;
    
    if (oldApiKeys) {
      const apiKeys = JSON.parse(oldApiKeys);
      console.log('🔄 Migrating old API keys:', { hasKucoin: !!(apiKeys.kucoinApiKey || apiKeys.kucoinApiSecret), hasOpenRouter: !!apiKeys.openRouterApiKey });
      
      // Use the correct field names for migration
      if (apiKeys.kucoinApiKey || apiKeys.kucoinApiSecret || apiKeys.kucoinApiPassphrase) {
        migration.kucoin = {
          key: apiKeys.kucoinApiKey || '',
          secret: apiKeys.kucoinApiSecret || '', // Map apiSecret to secret
          passphrase: apiKeys.kucoinApiPassphrase || '',
          verified: true // Mark as verified since these were working keys
        };
        hasKucoinData = !!(apiKeys.kucoinApiKey && apiKeys.kucoinApiSecret && apiKeys.kucoinApiPassphrase);
      }
      if (apiKeys.openRouterApiKey) {
        migration.openRouter = {
          apiKey: apiKeys.openRouterApiKey,
          verified: true // Mark as verified since these were working keys
        };
        hasOpenRouterData = true;
      }
    }
    
    if (oldUserSettings) {
      const userSettings = JSON.parse(oldUserSettings);
      console.log('🔄 Migrating old user settings:', { hasProxy: !!userSettings.proxyUrl, hasModel: !!userSettings.selectedAiModelId });
      
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
          verified: true // Mark as verified since this was a working model
        };
      }
    }
    
    const shouldMarkVerified = hasKucoinData && hasOpenRouterData;
    
    if (shouldMarkVerified) {
      loggingService.logEvent('API', 'Successfully migrated and verified settings from old format');
      console.log('✅ Migration successful - all blocks will be marked as verified');
    } else {
      loggingService.logEvent('API', 'Partial migration from old format - verification required');
    }
    
    return { settings: migration, shouldMarkVerified };
  } catch (error) {
    console.warn('Could not migrate old settings:', error);
    return { settings: {}, shouldMarkVerified: false };
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
      let shouldMarkAllVerified = false;
      
      if (stored) {
        const parsed = JSON.parse(stored) as VerifiedSettings;
        settings = {
          ...settings,
          ...parsed,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
      } else {
        // Try to migrate from old settings
        const { settings: migrated, shouldMarkVerified } = migrateFromOldSettings();
        if (Object.keys(migrated).length > 0) {
          settings = { ...settings, ...migrated };
          shouldMarkAllVerified = shouldMarkVerified;
          console.log('✅ Successfully migrated old settings to V2 format');
          
          // Clean up old storage keys after successful migration
          localStorage.removeItem(OLD_STORAGE_KEYS.API_KEYS);
          localStorage.removeItem(OLD_STORAGE_KEYS.USER_SETTINGS);
        }
      }
      
      // Update blocks based on verification status
      const blocks = getDefaultBlocks();
      
      if (shouldMarkAllVerified) {
        // Mark all blocks as verified for successful migration
        blocks.kucoin.verified = true;
        blocks.openRouter.verified = true;
        blocks.model.verified = true;
        blocks.proxy.verified = true;
        console.log('🎉 Migration complete - all blocks marked as verified');
      } else {
        // Use individual verification status
        blocks.kucoin.verified = settings.kucoin.verified;
        blocks.openRouter.verified = settings.openRouter.verified;
        blocks.model.verified = settings.model.verified;
        blocks.proxy.verified = true; // Proxy is always considered verified
      }
      
      set({ 
        settings,
        blocks,
        isLoading: false 
      });
      
      // Save the settings immediately if migration was successful
      if (shouldMarkAllVerified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        console.log('💾 Auto-saved migrated settings');
      }
      
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
