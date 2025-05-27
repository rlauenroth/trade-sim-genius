
import React from 'react';
import DashboardHeader from '../DashboardHeader';
import FirstTimeUserInfo from '../FirstTimeUserInfo';

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
  return (
    <>
      <DashboardHeader 
        isSimulationActive={isSimulationActive}
        isPaused={isPaused}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
        onRefresh={onRefresh}
      />

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
