
import { STORAGE_KEY } from './types';
import { getDefaultSettings, getDefaultBlocks } from './defaults';
import { migrateFromOldSettings, cleanupOldStorage } from './migration';
import { loggingService } from '@/services/loggingService';
import { GetState, SetState } from './actionTypes';

export const createLoadActions = (get: GetState, set: SetState) => ({
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
  }
});
