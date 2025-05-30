
import { useSetupManager } from './useSetupManager';
import { useSettingsManager } from './useSettingsManager';
import { useAppReset } from './useAppReset';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useState, useCallback } from 'react';
import { loggingService } from '@/services/loggingService';

export const useAppState = () => {
  const [isFirstTimeAfterSetup, setIsFirstTimeAfterSetup] = useState(false);

  // Use the centralized settings store directly
  const { settings, isLoading } = useSettingsV2Store();

  const {
    isSetupComplete,
    currentStep,
    setCurrentStep,
    checkSetupStatus
  } = useSetupManager();

  const {
    userSettings,
    loadUserSettings,
    saveUserSettings
  } = useSettingsManager();

  // Map settings from V2 store to apiKeys format for backward compatibility
  const apiKeys = {
    kucoin: {
      key: settings.kucoin.key,
      secret: settings.kucoin.secret,
      passphrase: settings.kucoin.passphrase
    },
    openRouter: {
      apiKey: settings.openRouter.apiKey
    }
  };

  const {
    resetApp
  } = useAppReset();

  // Logout function that clears all API keys
  const logoutAndClearData = useCallback((): void => {
    console.log('🚪 Logout and clear data called (centralized)');
    loggingService.logInfo('User logout initiated', {
      tradingMode: settings.tradingMode
    });
    
    // Clear all data and reload the app
    localStorage.clear();
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [settings.tradingMode]);

  // Clear API keys from V2 store
  const clearApiKeys = useCallback(() => {
    const { updateKuCoinSettings, updateOpenRouterSettings } = useSettingsV2Store.getState();
    
    updateKuCoinSettings({
      key: '',
      secret: '',
      passphrase: '',
      verified: false
    });
    
    updateOpenRouterSettings({
      apiKey: '',
      verified: false
    });
    
    // Trigger a setup status check to redirect to setup
    setTimeout(() => {
      checkSetupStatus();
    }, 100);
  }, [checkSetupStatus]);

  // Complete first time setup
  const completeFirstTimeSetup = useCallback(() => {
    setIsFirstTimeAfterSetup(false);
  }, []);

  // Check if this is first time after setup (can be derived from storage)
  const checkFirstTimeSetup = useCallback(() => {
    // If we have API keys but no simulation state, it's likely first time after setup
    const hasSimulationState = localStorage.getItem('kiTradingApp_simulationState');
    const hasApiKeys = !!(settings.kucoin.key && settings.openRouter.apiKey);
    setIsFirstTimeAfterSetup(hasApiKeys && !hasSimulationState);
  }, [settings.kucoin.key, settings.openRouter.apiKey]);

  // Load API keys (for backward compatibility)
  const loadApiKeys = useCallback(() => {
    console.log("Using centralized settings store for API keys");
    return apiKeys;
  }, [apiKeys]);

  // Save API keys to the V2 store
  const saveApiKeys = useCallback(async (keys: any) => {
    const { updateKuCoinSettings, updateOpenRouterSettings } = useSettingsV2Store.getState();
    
    try {
      if (keys?.kucoin) {
        await updateKuCoinSettings({
          key: keys.kucoin.key || '',
          secret: keys.kucoin.secret || '',
          passphrase: keys.kucoin.passphrase || '',
          verified: false // Reset verification status when keys are updated
        });
      }
      
      if (keys?.openRouter?.apiKey) {
        await updateOpenRouterSettings({
          apiKey: keys.openRouter.apiKey,
          verified: false // Reset verification status when keys are updated
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error saving API keys to centralized store:", error);
      return false;
    }
  }, []);

  return {
    // Setup state
    isSetupComplete,
    currentStep,
    setCurrentStep,
    checkSetupStatus,
    
    // Settings state
    userSettings,
    loadUserSettings,
    saveUserSettings,
    
    // API Keys state (now from centralized V2 store)
    apiKeys,
    isLoading,
    saveApiKeys,
    loadApiKeys,
    clearApiKeys,
    logoutAndClearData,
    
    // First time setup state
    isFirstTimeAfterSetup,
    completeFirstTimeSetup,
    checkFirstTimeSetup,
    
    // Reset functionality
    resetApp
  };
};
