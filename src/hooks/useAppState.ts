
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
  const [userSettings, setUserSettings] = useState<UserSettings>({
    tradingStrategy: 'balanced',
    selectedAiModelId: 'anthropic/claude-3.5-sonnet',
    theme: 'dark',
    language: 'de'
  });
  const [decryptedApiKeys, setDecryptedApiKeys] = useState<ApiKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkSetupStatus = useCallback(() => {
    const hasEncryptedKeys = localStorage.getItem('kiTradingApp_apiKeys');
    const hasSalt = localStorage.getItem('kiTradingApp_securitySalt');
    const hasSettings = localStorage.getItem('kiTradingApp_userSettings');
    
    setIsSetupComplete(!!(hasEncryptedKeys && hasSalt && hasSettings));
  }, []);

  const loadUserSettings = useCallback(() => {
    try {
      const storedSettings = localStorage.getItem('kiTradingApp_userSettings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setUserSettings(prev => ({ ...prev, ...parsed }));
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
    setIsLoading(true);
    try {
      const encryptedKeys = localStorage.getItem('kiTradingApp_apiKeys');
      const salt = localStorage.getItem('kiTradingApp_securitySalt');
      
      if (!encryptedKeys || !salt) {
        throw new Error('Verschlüsselte Daten nicht gefunden');
      }
      
      const decryptedData = await decryptData(encryptedKeys, password, salt);
      const apiKeys = JSON.parse(decryptedData);
      
      setDecryptedApiKeys(apiKeys);
      setIsUnlocked(true);
      
      toast({
        title: "App entsperrt",
        description: "Willkommen zurück!",
      });
      
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
    setDecryptedApiKeys(null);
    setIsUnlocked(false);
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
    
    toast({
      title: "App zurückgesetzt",
      description: "Alle Daten wurden gelöscht. Sie können die App neu einrichten.",
    });
  }, []);

  return {
    isSetupComplete,
    isUnlocked,
    currentStep,
    userSettings,
    decryptedApiKeys,
    isLoading,
    setCurrentStep,
    checkSetupStatus,
    loadUserSettings,
    saveApiKeys,
    unlockApp,
    lockApp,
    saveUserSettings,
    resetApp
  };
};
