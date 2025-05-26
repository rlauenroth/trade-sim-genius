
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { UserSettings } from '@/types/appState';
import { storageUtils } from '@/utils/appStorage';

const DEFAULT_SETTINGS: UserSettings = {
  tradingStrategy: 'balanced',
  selectedAiModelId: 'anthropic/claude-3.5-sonnet',
  theme: 'dark',
  language: 'de'
};

export const useSettingsManager = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const loadUserSettings = useCallback(() => {
    console.log('Loading user settings...');
    try {
      const storedSettings = storageUtils.getUserSettings();
      if (storedSettings) {
        setUserSettings(prev => ({ ...prev, ...storedSettings }));
        console.log('User settings loaded successfully:', storedSettings);
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

  const saveUserSettings = useCallback((settings: Partial<UserSettings>) => {
    try {
      const newSettings = { ...userSettings, ...settings };
      setUserSettings(newSettings);
      
      if (storageUtils.saveUserSettings(newSettings)) {
        toast({
          title: "Einstellungen gespeichert",
          description: "Ihre Änderungen wurden übernommen.",
        });
      } else {
        throw new Error('Failed to save to localStorage');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  }, [userSettings]);

  return {
    userSettings,
    loadUserSettings,
    saveUserSettings
  };
};
