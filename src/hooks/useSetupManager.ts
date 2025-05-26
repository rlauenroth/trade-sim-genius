
import { useState, useCallback } from 'react';
import { storageUtils, STORAGE_KEYS } from '@/utils/appStorage';

export const useSetupManager = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const checkSetupStatus = useCallback(() => {
    console.log('Checking setup status...');
    const hasEncryptedKeys = storageUtils.getItem(STORAGE_KEYS.API_KEYS);
    const hasSalt = storageUtils.getItem(STORAGE_KEYS.SECURITY_SALT);
    const hasSettings = storageUtils.getItem(STORAGE_KEYS.USER_SETTINGS);
    
    const setupComplete = !!(hasEncryptedKeys && hasSalt && hasSettings);
    console.log('Setup status:', { hasEncryptedKeys: !!hasEncryptedKeys, hasSalt: !!hasSalt, hasSettings: !!hasSettings, setupComplete });
    
    setIsSetupComplete(setupComplete);
  }, []);

  return {
    isSetupComplete,
    currentStep,
    setCurrentStep,
    checkSetupStatus
  };
};
