
import { create } from 'zustand';
import { VerifiedSettings, SettingsBlock } from '@/types/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

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
    proxyUrl: '',
    lastUpdated: Date.now()
  };
};

const getDefaultBlocks = (): Record<string, SettingsBlock> => ({
  kucoin: { name: 'KuCoin', verified: false, modified: false },
  openRouter: { name: 'OpenRouter', verified: false, modified: false },
  model: { name: 'KI-Modell', verified: false, modified: false },
  proxy: { name: 'Proxy', verified: true, modified: false } // Proxy is optional, so verified by default
});

export const useSettingsV2Store = create<SettingsV2State>((set, get) => ({
  settings: getDefaultSettings(),
  blocks: getDefaultBlocks(),
  isLoading: false,

  load: () => {
    set({ isLoading: true });
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VerifiedSettings;
        
        // Migration from old settings format
        const migratedSettings = {
          ...getDefaultSettings(),
          ...parsed,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
        
        // Update blocks based on verification status
        const blocks = getDefaultBlocks();
        blocks.kucoin.verified = migratedSettings.kucoin.verified;
        blocks.openRouter.verified = migratedSettings.openRouter.verified;
        blocks.model.verified = migratedSettings.model.verified;
        blocks.proxy.verified = true; // Proxy is always considered verified
        
        set({ 
          settings: migratedSettings,
          blocks,
          isLoading: false 
        });
        
        loggingService.logEvent('API', 'Settings V2 loaded successfully');
      } else {
        set({ isLoading: false });
      }
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
    const { blocks } = get();
    set({
      blocks: {
        ...blocks,
        [blockName]: {
          ...blocks[blockName],
          verified
        }
      }
    });
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
