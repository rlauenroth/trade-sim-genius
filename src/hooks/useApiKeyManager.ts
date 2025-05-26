
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { ApiKeys } from '@/types/appState';
import { storageUtils, STORAGE_KEYS } from '@/utils/appStorage';
import { testApiKey } from '@/utils/openRouterApi';

export const useApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);

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
    setIsLoading(true);
    try {
      // Validate OpenRouter API key if provided
      if (newApiKeys.openRouterApiKey && newApiKeys.openRouterApiKey.trim() !== '') {
        const isValidKey = await validateApiKey(newApiKeys.openRouterApiKey);
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
      
      if (storageUtils.saveApiKeys(newApiKeys)) {
        setApiKeys(newApiKeys);
        
        // Mark that user has acknowledged the risk
        storageUtils.setItem(STORAGE_KEYS.USER_ACKNOWLEDGED_RISK, 'true');
        
        toast({
          title: "Erfolgreich",
          description: "API-Schlüssel wurden im Local Storage gespeichert.",
        });
        
        setIsLoading(false);
        return true;
      } else {
        throw new Error('Failed to save API keys');
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      setIsLoading(false);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  }, [validateApiKey]);

  const loadApiKeys = useCallback(() => {
    setIsLoading(true);
    try {
      const storedKeys = storageUtils.getApiKeys();
      if (storedKeys) {
        setApiKeys(storedKeys);
        console.log('API keys loaded successfully from storage');
      }
      setIsLoading(false);
      return storedKeys;
    } catch (error) {
      console.error('Error loading API keys:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearApiKeys = useCallback(() => {
    try {
      storageUtils.clearApiKeys();
      setApiKeys(null);
      toast({
        title: "Abgemeldet",
        description: "Alle API-Schlüssel wurden sicher gelöscht.",
      });
    } catch (error) {
      console.error('Error clearing API keys:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen der API-Schlüssel.",
        variant: "destructive"
      });
    }
  }, []);

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
