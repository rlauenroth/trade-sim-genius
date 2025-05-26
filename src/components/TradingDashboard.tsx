
import React from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import DashboardHeader from './TradingDashboard/DashboardHeader';
import StrategyInfo from './TradingDashboard/StrategyInfo';
import PortfolioOverview from './TradingDashboard/PortfolioOverview';
import ProgressTracker from './TradingDashboard/ProgressTracker';
import ControlCenter from './TradingDashboard/ControlCenter';
import SignalDisplay from './TradingDashboard/SignalDisplay';
import OpenPositions from './TradingDashboard/OpenPositions';
import ActivityLog from './TradingDashboard/ActivityLog';
import FirstTimeUserInfo from './TradingDashboard/FirstTimeUserInfo';
import PortfolioLoadingCard from './TradingDashboard/PortfolioLoadingCard';

const TradingDashboard = () => {
  const { userSettings, lockApp, isFirstTimeAfterSetup, completeFirstTimeSetup, decryptedApiKeys } = useAppState();
  const { portfolioData, isLoading: portfolioLoading, loadPortfolioData } = usePortfolioData();
  
  const { 
    simulationState, 
    isSimulationActive, 
    startSimulation, 
    stopSimulation, 
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    activityLog
  } = useSimulation();

  const {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue
  } = useTradingDashboardData(simulationState, portfolioData, isSimulationActive);

  const { handleStartSimulation, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup,
    decryptedApiKeys,
    portfolioData,
    loadPortfolioData,
    completeFirstTimeSetup,
    startSimulation
  });

  // Show loading state while portfolio is being loaded for first-time users
  if (isFirstTimeAfterSetup && portfolioLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard isLoading={true} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeader 
        isSimulationActive={isSimulationActive}
        isPaused={simulationState?.isPaused}
        onLockApp={lockApp}
      />

      {/* Show first-time user info if applicable */}
      {isFirstTimeAfterSetup && portfolioData && !isSimulationActive && (
        <FirstTimeUserInfo 
          onStartSimulation={handleStartSimulation}
          onOpenSettings={handleOpenSettings}
          strategy={userSettings.tradingStrategy}
          aiModel={userSettings.selectedAiModelId}
        />
      )}

      <StrategyInfo 
        strategy={userSettings.tradingStrategy}
        aiModel={userSettings.selectedAiModelId}
        timeElapsed={timeElapsed}
        isSimulationActive={isSimulationActive}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PortfolioOverview 
          currentValue={getDisplayPortfolioValue()}
          startValue={getDisplayStartValue()}
          totalPnL={getTotalPnL()}
          totalPnLPercentage={getTotalPnLPercentage()}
        />

        <ProgressTracker 
          startValue={getDisplayStartValue()}
          currentValue={getDisplayPortfolioValue()}
          progressValue={getProgressValue()}
        />

        <ControlCenter 
          isSimulationActive={isSimulationActive}
          isPaused={simulationState?.isPaused}
          onStartSimulation={handleStartSimulation}
          onPauseSimulation={pauseSimulation}
          onResumeSimulation={resumeSimulation}
          onStopSimulation={stopSimulation}
        />
      </div>

      <SignalDisplay 
        currentSignal={currentSignal}
        onAcceptSignal={acceptSignal}
        onIgnoreSignal={ignoreSignal}
      />

      <OpenPositions 
        positions={simulationState?.openPositions || []}
      />

      <ActivityLog 
        activityLog={activityLog}
      />
    </div>
  );
};

export default TradingDashboard;
