
import { useSetupManager } from './useSetupManager';
import { useSettingsManager } from './useSettingsManager';
import { useApiKeyManager } from './useApiKeyManager';
import { useAppReset } from './useAppReset';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useCallback } from 'react';

export const useAppState = () => {
  const [isFirstTimeAfterSetup, setIsFirstTimeAfterSetup] = useState(false);

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

  // Use the new Zustand store for API keys
  const { apiKeys, clearApiKeys } = useSettingsStore();

  const {
    isLoading,
    saveApiKeys,
    loadApiKeys
  } = useApiKeyManager();

  const {
    resetApp
  } = useAppReset();

  // Logout function that clears all API keys - ensure correct signature
  const logoutAndClearData = useCallback((): void => {
    clearApiKeys();
    // Trigger a setup status check to redirect to setup
    setTimeout(() => {
      checkSetupStatus();
    }, 100);
  }, [clearApiKeys, checkSetupStatus]);

  // Complete first time setup
  const completeFirstTimeSetup = useCallback(() => {
    setIsFirstTimeAfterSetup(false);
  }, []);

  // Check if this is first time after setup (can be derived from storage)
  const checkFirstTimeSetup = useCallback(() => {
    // If we have API keys but no simulation state, it's likely first time after setup
    const hasSimulationState = localStorage.getItem('kiTradingApp_simulationState');
    const hasApiKeys = !!apiKeys;
    setIsFirstTimeAfterSetup(hasApiKeys && !hasSimulationState);
  }, [apiKeys]);

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
    
    // API Keys state (now from Zustand store)
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
