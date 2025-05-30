
import { useCallback } from 'react';
import { UserSettings } from '@/types/appState';
import { useSettingsV2Store } from '@/stores/settingsV2';

// This hook now acts as a bridge to the V2 store
export const useSettingsManager = () => {
  const { 
    settings, 
    updateTradingMode,
    updateTradingStrategy,
    updateRiskLimits,
    updateProxyUrl,
    updateModel,
    isLoading
  } = useSettingsV2Store();
  
  // Map V2 settings to the legacy format
  const userSettings: UserSettings = {
    tradingStrategy: settings.tradingStrategy,
    selectedAiModelId: settings.model.id,
    proxyUrl: settings.proxyUrl,
    theme: 'dark', // Default value
    language: 'de', // Default value
    tradingMode: settings.tradingMode,
    createdAt: Date.now()
  };

  const loadUserSettings = useCallback(() => {
    console.log('Loading user settings via V2 store...');
    // V2 store already loads automatically
    return userSettings;
  }, [userSettings]);

  const saveUserSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    try {
      console.log('Saving user settings to V2 store:', newSettings);
      
      if (newSettings.tradingMode !== undefined) {
        await updateTradingMode(newSettings.tradingMode);
      }
      
      if (newSettings.tradingStrategy !== undefined) {
        await updateTradingStrategy(newSettings.tradingStrategy);
      }
      
      if (newSettings.proxyUrl !== undefined) {
        await updateProxyUrl(newSettings.proxyUrl);
      }
      
      if (newSettings.selectedAiModelId !== undefined) {
        const defaultProvider = 'OpenAI'; // Default provider
        await updateModel({
          id: newSettings.selectedAiModelId,
          provider: defaultProvider,
          priceUsdPer1k: 0, // These will be updated by modelProviderService
          latencyMs: 0,
          verified: false
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error saving settings to V2 store:", error);
      return false;
    }
  }, [updateTradingMode, updateTradingStrategy, updateProxyUrl, updateModel]);

  return {
    userSettings,
    loadUserSettings,
    saveUserSettings,
    isLoading
  };
};
