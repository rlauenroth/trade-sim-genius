
import React from 'react';
import DashboardHeader from '../DashboardHeader';
import FirstTimeUserInfo from '../FirstTimeUserInfo';
import TradingModeIndicator from '../TradingModeIndicator';
import { useSettingsV2Store } from '@/stores/settingsV2';

interface DashboardHeaderSectionProps {
  isSimulationActive: boolean;
  isPaused?: boolean;
  isFirstTimeAfterSetup: boolean;
  livePortfolio: any;
  userSettings: any;
  onLogout: () => void;
  onRefresh: () => void;
  onStartSimulation: () => void;
  onOpenSettings: () => void;
}

const DashboardHeaderSection = ({
  isSimulationActive,
  isPaused,
  isFirstTimeAfterSetup,
  livePortfolio,
  userSettings,
  onLogout,
  onRefresh,
  onStartSimulation,
  onOpenSettings
}: DashboardHeaderSectionProps) => {
  const { settings } = useSettingsV2Store();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <DashboardHeader 
          isSimulationActive={isSimulationActive}
          isPaused={isPaused}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          onRefresh={onRefresh}
        />
        
        {/* Trading Mode Indicator */}
        <TradingModeIndicator 
          mode={settings.tradingMode} 
          className="ml-4"
        />
      </div>

      {/* Show first-time user info if applicable */}
      {isFirstTimeAfterSetup && livePortfolio && !isSimulationActive && (
        <FirstTimeUserInfo 
          onStartSimulation={onStartSimulation}
          onOpenSettings={onOpenSettings}
          strategy={userSettings.tradingStrategy}
          aiModel={userSettings.selectedAiModelId}
        />
      )}
    </>
  );
};

export default DashboardHeaderSection;
