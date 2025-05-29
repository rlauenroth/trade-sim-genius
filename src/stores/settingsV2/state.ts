
import { VerifiedSettings, SettingsBlock } from './types';
import { SettingsV2Actions } from './actions';

export interface SettingsV2State {
  settings: VerifiedSettings;
  blocks: Record<string, SettingsBlock>;
  isLoading: boolean;
}

export interface SettingsV2Store extends SettingsV2State, SettingsV2Actions {}
