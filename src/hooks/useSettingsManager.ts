
import { useState, useCallback } from 'react';
import { UserSettings } from '@/types/appState';
import { useSettingsStore } from '@/stores/settingsStore';

// This hook now acts as a bridge to the Zustand store
export const useSettingsManager = () => {
  const { 
    userSettings, 
    saveSettings, 
    load 
  } = useSettingsStore();

  const loadUserSettings = useCallback(() => {
    console.log('Loading user settings via store...');
    load();
  }, [load]);

  const saveUserSettings = useCallback(async (settings: Partial<UserSettings>) => {
    return await saveSettings(settings);
  }, [saveSettings]);

  return {
    userSettings,
    loadUserSettings,
    saveUserSettings
  };
};
