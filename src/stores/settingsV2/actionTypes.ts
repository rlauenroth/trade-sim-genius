
import { VerifiedSettings } from './types';

export interface SettingsV2Actions {
  load: () => void;
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => void;
  markBlockModified: (blockName: string) => void;
  markBlockVerified: (blockName: string, verified: boolean) => void;
  canSave: () => boolean;
  saveSettings: () => Promise<boolean>;
  resetBlock: (blockName: string) => void;
}

export type GetState = () => any;
export type SetState = (partial: any) => void;
