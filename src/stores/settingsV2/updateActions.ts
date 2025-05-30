
import { VerifiedSettings } from './types';
import { GetState, SetState } from './actionTypes';

export const createUpdateActions = (get: GetState, set: SetState) => ({
  updateBlock: (blockName: string, data: Partial<VerifiedSettings>) => {
    const { settings, blocks } = get();
    const newSettings = { ...settings, ...data, lastUpdated: Date.now() };
    const newBlocks = {
      ...blocks,
      [blockName]: {
        ...blocks[blockName],
        modified: true,
        verified: false // Reset verification when modified
      }
    };
    
    set({ settings: newSettings, blocks: newBlocks });
  },

  markBlockModified: (blockName: string) => {
    const { blocks } = get();
    set({
      blocks: {
        ...blocks,
        [blockName]: {
          ...blocks[blockName],
          modified: true
        }
      }
    });
  },

  resetBlock: (blockName: string) => {
    const { blocks } = get();
    set({
      blocks: {
        ...blocks,
        [blockName]: {
          ...blocks[blockName],
          modified: false,
          verified: false
        }
      }
    });
  },

  // Add specific update methods
  updateKuCoinSettings: (kuCoinSettings: Partial<VerifiedSettings['kucoin']>) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      kucoin: { ...settings.kucoin, ...kuCoinSettings },
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateOpenRouterSettings: (openRouterSettings: Partial<VerifiedSettings['openRouter']>) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      openRouter: { ...settings.openRouter, ...openRouterSettings },
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateTradingMode: (tradingMode: VerifiedSettings['tradingMode']) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      tradingMode,
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateTradingStrategy: (tradingStrategy: VerifiedSettings['tradingStrategy']) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      tradingStrategy,
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateRiskLimits: (riskLimits: Partial<VerifiedSettings['riskLimits']>) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      riskLimits: { ...settings.riskLimits, ...riskLimits },
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateProxyUrl: (proxyUrl: string) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      proxyUrl,
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  },

  updateModel: (model: Partial<VerifiedSettings['model']>) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      model: { ...settings.model, ...model },
      lastUpdated: Date.now()
    };
    set({ settings: newSettings });
  }
});
