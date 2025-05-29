
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

// Initialize store
if (typeof window !== 'undefined') {
  useSettingsV2Store.getState().load();
}
