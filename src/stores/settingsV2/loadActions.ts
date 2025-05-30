
import { STORAGE_KEY } from './types';
import { getDefaultSettings, getDefaultBlocks } from './defaults';
import { migrateFromOldSettings, cleanupOldStorage } from './migration';
import { validateSettings, sanitizeSettings } from './validation';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';
import { GetState, SetState } from './actionTypes';
import { VerifiedSettings } from './types';

export const createLoadActions = (get: GetState, set: SetState) => ({
  load: () => {
    set({ isLoading: true });
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let settings: VerifiedSettings = getDefaultSettings();
      let shouldMarkAllVerified = false;
      let wasCorrupted = false;
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          
          // Validate and sanitize loaded settings
          const validation = validateSettings(parsed);
          if (validation.isValid && validation.settings) {
            settings = validation.settings;
          } else {
            // Settings are corrupted, sanitize them
            loggingService.logError('Corrupted settings detected, sanitizing...', {
              errors: validation.errors
            });
            settings = sanitizeSettings(parsed, getDefaultSettings());
            wasCorrupted = true;
          }
        } catch (parseError) {
          loggingService.logError('Failed to parse stored settings', {
            error: parseError instanceof Error ? parseError.message : 'Parse error'
          });
          settings = sanitizeSettings({}, getDefaultSettings());
          wasCorrupted = true;
        }
      } else {
        // Try to migrate from old settings
        const { settings: migratedSettings, shouldMarkVerified } = migrateFromOldSettings();
        settings = migratedSettings;
        shouldMarkAllVerified = shouldMarkVerified;
        
        if (Object.keys(migratedSettings.kucoin).some(key => migratedSettings.kucoin[key as keyof typeof migratedSettings.kucoin]) || migratedSettings.openRouter.apiKey) {
          console.log('✅ Successfully migrated and validated old settings to V2 format');
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
      
      // Save the settings immediately if they were sanitized or migrated
      if (shouldMarkAllVerified || wasCorrupted) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        console.log('💾 Auto-saved validated settings');
        
        if (wasCorrupted) {
          toast({
            title: "Einstellungen repariert",
            description: "Beschädigte Einstellungen wurden automatisch repariert.",
            variant: "default"
          });
        }
      }
      
      loggingService.logEvent('API', 'Settings V2 loaded and validated successfully');
    } catch (error) {
      console.error('Error loading settings V2:', error);
      loggingService.logError('Critical error loading settings', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      set({ 
        settings: getDefaultSettings(),
        blocks: getDefaultBlocks(),
        isLoading: false 
      });
      
      toast({
        title: "Einstellungen-Fehler",
        description: "Einstellungen konnten nicht geladen werden. Standard-Werte werden verwendet.",
        variant: "destructive"
      });
    }
  }
});
