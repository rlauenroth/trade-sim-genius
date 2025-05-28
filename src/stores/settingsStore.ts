
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import { SettingsState } from './settings/types';
import { DEFAULT_SETTINGS, DEFAULT_RISK_LIMITS } from './settings/constants';
import { validateApiKeys, validateSettings } from './settings/validation';
import { loadApiKeys, loadUserSettings, loadRiskLimits } from './settings/storage';
import {
  createSaveApiKeysAction,
  createSaveSettingsAction,
  createSaveRiskLimitsAction,
  createClearApiKeysAction,
  createEnableRealModeAction,
  createDisableRealModeAction
} from './settings/actions';

export const useSettingsStore = create<SettingsState>((set, get) => {
  const saveSettings = createSaveSettingsAction(get, set);
  
  return {
    apiKeys: null,
    userSettings: DEFAULT_SETTINGS,
    riskLimits: DEFAULT_RISK_LIMITS,
    isLoading: false,

    load: () => {
      set({ isLoading: true });
      
      try {
        const apiKeys = loadApiKeys();
        const userSettings = loadUserSettings();
        const riskLimits = loadRiskLimits();
        
        // Show migration toast if proxy URL was updated
        if (userSettings.proxyUrl !== loadUserSettings().proxyUrl) {
          toast({
            title: "Proxy-URL aktualisiert",
            description: "Die Proxy-URL wurde auf den neuen Server aktualisiert.",
          });
        }
        
        set({ 
          apiKeys, 
          userSettings,
          riskLimits,
          isLoading: false 
        });
        
        console.log('Settings loaded successfully');
      } catch (error) {
        console.error('Error loading settings:', error);
        set({ 
          apiKeys: null, 
          userSettings: DEFAULT_SETTINGS,
          riskLimits: DEFAULT_RISK_LIMITS,
          isLoading: false 
        });
      }
    },

    saveApiKeys: createSaveApiKeysAction(get, set),
    saveSettings,
    saveRiskLimits: createSaveRiskLimitsAction(get, set),
    clearApiKeys: createClearApiKeysAction(get, set),
    enableRealMode: createEnableRealModeAction(get, saveSettings),
    disableRealMode: createDisableRealModeAction(saveSettings),
    validateApiKeys,
    validateSettings: (settings) => validateSettings(settings, !!get().apiKeys?.kucoin)
  };
});

// Initialize store
if (typeof window !== 'undefined') {
  useSettingsStore.getState().load();
}
