
import { useState } from 'react';
import { useDashboardStateManager } from '../DashboardStateManager';
import { usePinAuthentication } from '@/hooks/usePinAuthentication';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useTradingDashboardState = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  
  const dashboardState = useDashboardStateManager();
  const { updateTradingMode: syncUpdateTradingMode } = useSettingsV2Store();

  // Only use PIN authentication if in real trading mode
  const shouldUsePinAuth = dashboardState.userSettings?.tradingMode === 'real';
  
  // Wrap the synchronous updateTradingMode in an async function
  const updateTradingMode = async (mode: 'simulation' | 'real'): Promise<void> => {
    syncUpdateTradingMode(mode);
  };
  
  const pinAuth = usePinAuthentication();

  return {
    showSettings,
    setShowSettings,
    initializationComplete,
    setInitializationComplete,
    shouldUsePinAuth,
    updateTradingMode,
    ...dashboardState,
    ...pinAuth
  };
};
