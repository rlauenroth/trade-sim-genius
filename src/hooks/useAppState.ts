
import { useSetupManager } from './useSetupManager';
import { useSettingsManager } from './useSettingsManager';
import { useAuthManager } from './useAuthManager';
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
    isUnlocked,
    isFirstTimeAfterSetup,
    decryptedApiKeys,
    isLoading,
    saveApiKeys,
    unlockApp,
    lockApp,
    completeFirstTimeSetup
  } = useAuthManager();

  const {
    resetApp
  } = useAppReset();

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
    
    // Auth state
    isUnlocked,
    isFirstTimeAfterSetup,
    decryptedApiKeys,
    isLoading,
    saveApiKeys,
    unlockApp,
    lockApp,
    completeFirstTimeSetup,
    
    // Reset functionality
    resetApp
  };
};
