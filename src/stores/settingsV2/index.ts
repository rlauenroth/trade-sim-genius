
import { create } from 'zustand';
import { SettingsV2Store } from './state';
import { getDefaultSettings, getDefaultBlocks } from './defaults';
import { createSettingsV2Actions } from './actions';

export const useSettingsV2Store = create<SettingsV2Store>((set, get) => ({
  settings: getDefaultSettings(),
  blocks: getDefaultBlocks(),
  isLoading: false,
  
  ...createSettingsV2Actions(get, set)
}));

// Initialize store immediately
if (typeof window !== 'undefined') {
  console.log('🏗️ Initializing V2 settings store...');
  useSettingsV2Store.getState().load();
}

// Export type for external usage
export type { SettingsV2Store } from './state';
