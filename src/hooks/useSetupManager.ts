
import { useState, useCallback } from 'react';
import { storageUtils, STORAGE_KEYS, cleanupCorruptedStorage } from '@/utils/appStorage';

export const useSetupManager = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const checkSetupStatus = useCallback(() => {
    console.log('Checking setup status...');
    
    // Clean up any corrupted localStorage data first
    cleanupCorruptedStorage();
    
    const hasApiKeys = storageUtils.getApiKeys();
    const hasSettings = storageUtils.getItem(STORAGE_KEYS.USER_SETTINGS);
    const hasAcknowledgedRisk = storageUtils.hasAcknowledgedRisk();
    
    const setupComplete = !!(hasApiKeys && hasSettings && hasAcknowledgedRisk);
    console.log('Setup status:', { 
      hasApiKeys: !!hasApiKeys, 
      hasSettings: !!hasSettings, 
      hasAcknowledgedRisk,
      setupComplete 
    });
    
    setIsSetupComplete(setupComplete);
  }, []);

  return {
    isSetupComplete,
    currentStep,
    setCurrentStep,
    checkSetupStatus
  };
};
