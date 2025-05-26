
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
      
      console.log('useAuthManager: Setting decrypted API keys and unlock state after setup');
      setDecryptedApiKeys(apiKeys);
      setIsFirstTimeAfterSetup(true);
      setIsUnlocked(true);
      setIsLoading(false);
      
      toast({
        title: "Erfolgreich",
        description: "API-Schlüssel wurden sicher verschlüsselt und gespeichert.",
      });
      
      return true;
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
      
      console.log('useAuthManager: Decrypting data...');
      const decryptedData = await decryptData(encryptedKeys, password, salt);
      const apiKeys = JSON.parse(decryptedData);
      
      console.log('useAuthManager: Setting decrypted API keys and state...');
      setDecryptedApiKeys(apiKeys);
      setIsFirstTimeAfterSetup(false);
      
      // Set isUnlocked BEFORE setting isLoading to false - this is critical for proper state flow
      console.log('useAuthManager: Setting isUnlocked to true...');
      setIsUnlocked(true);
      
      console.log('useAuthManager: Setting isLoading to false...');
      setIsLoading(false);
      
      toast({
        title: "App entsperrt",
        description: "Willkommen zurück!",
      });
      
      console.log('=== UNLOCK PROCESS COMPLETED - STATE SHOULD BE UNLOCKED ===');
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
    console.log('useAuthManager: Locking app...');
    setDecryptedApiKeys(null);
    setIsUnlocked(false);
    setIsFirstTimeAfterSetup(false);
    toast({
      title: "App gesperrt",
      description: "Ihre Daten sind sicher gesperrt.",
    });
  }, []);

  const completeFirstTimeSetup = useCallback(() => {
    console.log('useAuthManager: Completing first time setup...');
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
