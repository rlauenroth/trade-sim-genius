
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { ApiKeys } from '@/types/appState';
import { encryptData, decryptData, generateSalt } from '@/utils/encryption';
import { storageUtils, STORAGE_KEYS } from '@/utils/appStorage';

export const useAuthManager = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFirstTimeAfterSetup, setIsFirstTimeAfterSetup] = useState(false);
  const [decryptedApiKeys, setDecryptedApiKeys] = useState<ApiKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const saveApiKeys = useCallback(async (apiKeys: ApiKeys, password: string) => {
    setIsLoading(true);
    try {
      const salt = generateSalt();
      const encryptedKeys = await encryptData(JSON.stringify(apiKeys), password, salt);
      
      storageUtils.setItem(STORAGE_KEYS.API_KEYS, encryptedKeys);
      storageUtils.setItem(STORAGE_KEYS.SECURITY_SALT, salt);
      
      setDecryptedApiKeys(apiKeys);
      setIsUnlocked(true);
      setIsFirstTimeAfterSetup(true);
      
      toast({
        title: "Erfolgreich",
        description: "API-Schlüssel wurden sicher verschlüsselt und gespeichert.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlockApp = useCallback(async (password: string) => {
    console.log('=== UNLOCK PROCESS STARTED ===');
    setIsLoading(true);
    
    try {
      const encryptedKeys = storageUtils.getItem(STORAGE_KEYS.API_KEYS);
      const salt = storageUtils.getItem(STORAGE_KEYS.SECURITY_SALT);
      
      if (!encryptedKeys || !salt) {
        throw new Error('Verschlüsselte Daten nicht gefunden');
      }
      
      console.log('Decrypting data...');
      const decryptedData = await decryptData(encryptedKeys, password, salt);
      const apiKeys = JSON.parse(decryptedData);
      
      console.log('Setting decrypted API keys...');
      setDecryptedApiKeys(apiKeys);
      setIsFirstTimeAfterSetup(false);
      setIsLoading(false);
      setIsUnlocked(true);
      
      toast({
        title: "App entsperrt",
        description: "Willkommen zurück!",
      });
      
      console.log('=== UNLOCK PROCESS COMPLETED ===');
      return true;
      
    } catch (error) {
      console.error('Error unlocking app:', error);
      setIsLoading(false);
      toast({
        title: "Fehler",
        description: "Falsches Passwort oder beschädigte Daten.",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  const lockApp = useCallback(() => {
    console.log('Locking app...');
    setDecryptedApiKeys(null);
    setIsUnlocked(false);
    setIsFirstTimeAfterSetup(false);
    toast({
      title: "App gesperrt",
      description: "Ihre Daten sind sicher gesperrt.",
    });
  }, []);

  const completeFirstTimeSetup = useCallback(() => {
    setIsFirstTimeAfterSetup(false);
  }, []);

  return {
    isUnlocked,
    isFirstTimeAfterSetup,
    decryptedApiKeys,
    isLoading,
    saveApiKeys,
    unlockApp,
    lockApp,
    completeFirstTimeSetup
  };
};
