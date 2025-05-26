
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { encryptData, decryptData, generateSalt } from '@/utils/encryption';

interface UserSettings {
  tradingStrategy: 'conservative' | 'balanced' | 'aggressive';
  selectedAiModelId: string;
  theme?: 'light' | 'dark';
  language?: 'de' | 'en';
}

interface ApiKeys {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
  openRouterApiKey: string;
}

export const useAppState = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFirstTimeAfterSetup, setIsFirstTimeAfterSetup] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    tradingStrategy: 'balanced',
    selectedAiModelId: 'anthropic/claude-3.5-sonnet',
    theme: 'dark',
    language: 'de'
  });
  const [decryptedApiKeys, setDecryptedApiKeys] = useState<ApiKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkSetupStatus = useCallback(() => {
    console.log('Checking setup status...');
    const hasEncryptedKeys = localStorage.getItem('kiTradingApp_apiKeys');
    const hasSalt = localStorage.getItem('kiTradingApp_securitySalt');
    const hasSettings = localStorage.getItem('kiTradingApp_userSettings');
    
    const setupComplete = !!(hasEncryptedKeys && hasSalt && hasSettings);
    console.log('Setup status:', { hasEncryptedKeys: !!hasEncryptedKeys, hasSalt: !!hasSalt, hasSettings: !!hasSettings, setupComplete });
    
    setIsSetupComplete(setupComplete);
  }, []);

  const loadUserSettings = useCallback(() => {
    console.log('Loading user settings...');
    try {
      const storedSettings = localStorage.getItem('kiTradingApp_userSettings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setUserSettings(prev => ({ ...prev, ...parsed }));
        console.log('User settings loaded successfully:', parsed);
      } else {
        console.log('No stored settings found');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast({
        title: "Fehler",
        description: "Benutzereinstellungen konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  }, []);

  const saveApiKeys = useCallback(async (apiKeys: ApiKeys, password: string) => {
    setIsLoading(true);
    try {
      const salt = generateSalt();
      const encryptedKeys = await encryptData(JSON.stringify(apiKeys), password, salt);
      
      localStorage.setItem('kiTradingApp_apiKeys', encryptedKeys);
      localStorage.setItem('kiTradingApp_securitySalt', salt);
      
      setIsSetupComplete(true);
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
    console.log('Starting unlock process...');
    setIsLoading(true);
    
    try {
      const encryptedKeys = localStorage.getItem('kiTradingApp_apiKeys');
      const salt = localStorage.getItem('kiTradingApp_securitySalt');
      
      if (!encryptedKeys || !salt) {
        throw new Error('Verschlüsselte Daten nicht gefunden');
      }
      
      console.log('Decrypting data...');
      const decryptedData = await decryptData(encryptedKeys, password, salt);
      const apiKeys = JSON.parse(decryptedData);
      
      console.log('Decryption successful, updating states...');
      
      // Update states synchronously
      setDecryptedApiKeys(apiKeys);
      setIsFirstTimeAfterSetup(false);
      
      // Load user settings immediately
      const storedSettings = localStorage.getItem('kiTradingApp_userSettings');
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setUserSettings(prev => ({ ...prev, ...parsed }));
          console.log('User settings loaded during unlock:', parsed);
        } catch (error) {
          console.error('Error loading settings during unlock:', error);
        }
      }
      
      // Set unlocked state last to trigger re-render
      console.log('Setting isUnlocked to true...');
      setIsUnlocked(true);
      
      toast({
        title: "App entsperrt",
        description: "Willkommen zurück!",
      });
      
      console.log('Unlock process completed successfully');
      return true;
      
    } catch (error) {
      console.error('Error unlocking app:', error);
      toast({
        title: "Fehler",
        description: "Falsches Passwort oder beschädigte Daten.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
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

  const saveUserSettings = useCallback((settings: Partial<UserSettings>) => {
    try {
      const newSettings = { ...userSettings, ...settings };
      setUserSettings(newSettings);
      localStorage.setItem('kiTradingApp_userSettings', JSON.stringify(newSettings));
      
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Änderungen wurden übernommen.",
      });
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  }, [userSettings]);

  const resetApp = useCallback(() => {
    localStorage.removeItem('kiTradingApp_apiKeys');
    localStorage.removeItem('kiTradingApp_securitySalt');
    localStorage.removeItem('kiTradingApp_userSettings');
    localStorage.removeItem('kiTradingApp_simulationState');
    localStorage.removeItem('kiTradingApp_activityLog');
    
    setIsSetupComplete(false);
    setIsUnlocked(false);
    setDecryptedApiKeys(null);
    setCurrentStep(0);
    setIsFirstTimeAfterSetup(false);
    
    toast({
      title: "App zurückgesetzt",
      description: "Alle Daten wurden gelöscht. Sie können die App neu einrichten.",
    });
  }, []);

  const completeFirstTimeSetup = useCallback(() => {
    setIsFirstTimeAfterSetup(false);
  }, []);

  return {
    isSetupComplete,
    isUnlocked,
    currentStep,
    userSettings,
    decryptedApiKeys,
    isLoading,
    isFirstTimeAfterSetup,
    setCurrentStep,
    checkSetupStatus,
    loadUserSettings,
    saveApiKeys,
    unlockApp,
    lockApp,
    saveUserSettings,
    resetApp,
    completeFirstTimeSetup
  };
};
