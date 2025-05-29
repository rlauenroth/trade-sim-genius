
import { VerifiedSettings, SettingsBlock, STORAGE_KEY } from './types';
import { getDefaultSettings, getDefaultBlocks } from './defaults';
import { migrateFromOldSettings, cleanupOldStorage } from './migration';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

export interface SettingsV2Actions {
  load: () => void;
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => void;
  markBlockModified: (blockName: string) => void;
  markBlockVerified: (blockName: string, verified: boolean) => void;
  canSave: () => boolean;
  saveSettings: () => Promise<boolean>;
  resetBlock: (blockName: string) => void;
}

export const createSettingsV2Actions = (
  get: () => any,
  set: (partial: any) => void
): SettingsV2Actions => ({
  load: () => {
    set({ isLoading: true });
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let settings = getDefaultSettings();
      let shouldMarkAllVerified = false;
      
      if (stored) {
        const parsed = JSON.parse(stored);
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
          cleanupOldStorage();
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

  updateBlock: (blockName: string, data) => {
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
});
