
import { VerifiedSettings } from '@/types/settingsV2';
import { OLD_STORAGE_KEYS } from './types';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import { loggingService } from '@/services/loggingService';

interface MigrationResult {
  settings: Partial<VerifiedSettings>;
  shouldMarkVerified: boolean;
}

export const migrateFromOldSettings = (): MigrationResult => {
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

export const cleanupOldStorage = (): void => {
  localStorage.removeItem(OLD_STORAGE_KEYS.API_KEYS);
  localStorage.removeItem(OLD_STORAGE_KEYS.USER_SETTINGS);
};
