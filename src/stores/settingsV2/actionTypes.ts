
import { VerifiedSettings } from './types';

export interface SettingsV2Actions {
  load: () => void;
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => void;
  markBlockModified: (blockName: string) => void;
  markBlockVerified: (blockName: string, verified: boolean) => void;
  canSave: () => boolean;
  saveSettings: () => Promise<boolean>;
  resetBlock: (blockName: string) => void;
  
  // Add missing update methods
  updateKuCoinSettings: (settings: Partial<VerifiedSettings['kucoin']>) => void;
  updateOpenRouterSettings: (settings: Partial<VerifiedSettings['openRouter']>) => void;
  updateTradingMode: (mode: VerifiedSettings['tradingMode']) => void;
  updateTradingStrategy: (strategy: VerifiedSettings['tradingStrategy']) => void;
  updateRiskLimits: (limits: Partial<VerifiedSettings['riskLimits']>) => void;
  updateProxyUrl: (url: string) => void;
  updateModel: (model: Partial<VerifiedSettings['model']>) => void;
}

export type GetState = () => any;
export type SetState = (partial: any) => void;
