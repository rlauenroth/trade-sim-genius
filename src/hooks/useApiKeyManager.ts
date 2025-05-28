
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { ApiKeys } from '@/types/appState';
import { useSettingsStore } from '@/stores/settingsStore';
import { testApiKey } from '@/utils/openRouter';

export const useApiKeyManager = () => {
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const { 
    apiKeys, 
    saveApiKeys: storeSaveApiKeys, 
    clearApiKeys: storeClearApiKeys,
    isLoading 
  } = useSettingsStore();

  const validateApiKey = useCallback(async (openRouterApiKey: string): Promise<boolean> => {
    if (!openRouterApiKey || openRouterApiKey.trim() === '') {
      return false;
    }
    
    setIsValidatingApiKey(true);
    try {
      const isValid = await testApiKey(openRouterApiKey);
      setIsValidatingApiKey(false);
      return isValid;
    } catch (error) {
      console.error('Error validating API key:', error);
      setIsValidatingApiKey(false);
      return false;
    }
  }, []);

  const saveApiKeys = useCallback(async (newApiKeys: ApiKeys) => {
    try {
      // Validate OpenRouter API key if provided
      if (newApiKeys.openRouter && newApiKeys.openRouter.trim() !== '') {
        const isValidKey = await validateApiKey(newApiKeys.openRouter);
        if (!isValidKey) {
          toast({
            title: "Warnung",
            description: "OpenRouter API-Schlüssel scheint ungültig zu sein. Die App läuft im Demo-Modus.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erfolgreich",
            description: "OpenRouter API-Schlüssel erfolgreich validiert.",
          });
        }
      }
      
      return await storeSaveApiKeys(newApiKeys);
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  }, [validateApiKey, storeSaveApiKeys]);

  const loadApiKeys = useCallback(() => {
    // Keys are automatically loaded by the store
    return apiKeys;
  }, [apiKeys]);

  // Fix signature to match expected interface - no parameters, void return
  const clearApiKeys = useCallback(() => {
    storeClearApiKeys();
  }, [storeClearApiKeys]);

  return {
    apiKeys,
    isLoading,
    isValidatingApiKey,
    saveApiKeys,
    loadApiKeys,
    clearApiKeys,
    validateApiKey
  };
};
