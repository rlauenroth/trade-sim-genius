
import { useSetupManager } from './useSetupManager';
import { useSettingsManager } from './useSettingsManager';
import { useApiKeyManager } from './useApiKeyManager';
import { useAppReset } from './useAppReset';

export const useAppState = () => {
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

  const {
    apiKeys,
    isLoading,
    saveApiKeys,
    loadApiKeys,
    clearApiKeys
  } = useApiKeyManager();

  const {
    resetApp
  } = useAppReset();

  // Logout function that clears all API keys
  const logoutAndClearData = () => {
    clearApiKeys();
    // Optionally trigger a setup status check to redirect to setup
    setTimeout(() => {
      checkSetupStatus();
    }, 100);
  };

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
    
    // API Keys state (simplified from auth)
    apiKeys,
    isLoading,
    saveApiKeys,
    loadApiKeys,
    clearApiKeys,
    logoutAndClearData,
    
    // Reset functionality
    resetApp
  };
};
