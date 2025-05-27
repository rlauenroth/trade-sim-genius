
import React from 'react';
import DashboardHeader from './DashboardHeader';
import StrategyInfo from './StrategyInfo';
import PortfolioOverviewWithStatus from './PortfolioOverviewWithStatus';
import PortfolioTable from './PortfolioTable';
import ProgressTracker from './ProgressTracker';
import ControlCenter from './ControlCenter';
import SignalDisplay from './SignalDisplay';
import OpenPositions from './OpenPositions';
import ActivityLog from './ActivityLog';
import FirstTimeUserInfo from './FirstTimeUserInfo';
import PortfolioLoadingCard from './PortfolioLoadingCard';
import LiveStatusIndicator from './LiveStatusIndicator';
import SettingsDrawer from './SettingsDrawer';

interface DashboardContentProps {
  // State props
  userSettings: any;
  isFirstTimeAfterSetup: boolean;
  portfolioLoading: boolean;
  livePortfolioLoading: boolean;
  portfolioError: string | null;
  livePortfolioError: string | null;
  livePortfolio: any;
  simulationState: any;
  isSimulationActive: boolean;
  currentSignal: any;
  activityLog: any[];
  apiKeys: any;
  
  // Display values
  timeElapsed: string;
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  simulationDataForLog: any;
  
  // Handlers
  logoutAndClearData: () => void;
  handleManualRefresh: () => void;
  handleStartSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  acceptSignal: () => void;
  ignoreSignal: () => void;
  retryLoadPortfolioData: (keys: any) => void;
  
  // UI state
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const DashboardContent = ({
  userSettings,
  isFirstTimeAfterSetup,
  portfolioLoading,
  livePortfolioLoading,
  portfolioError,
  livePortfolioError,
  livePortfolio,
  simulationState,
  isSimulationActive,
  currentSignal,
  activityLog,
  apiKeys,
  timeElapsed,
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  simulationDataForLog,
  logoutAndClearData,
  handleManualRefresh,
  handleStartSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  acceptSignal,
  ignoreSignal,
  retryLoadPortfolioData,
  showSettings,
  setShowSettings
}: DashboardContentProps) => {
  // Show loading state while portfolio is being loaded for first-time users
  if (isFirstTimeAfterSetup && (portfolioLoading || livePortfolioLoading)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard 
          isLoading={true} 
          onRetry={() => retryLoadPortfolioData(apiKeys)}
        />
      </div>
    );
  }

  // Show error state with retry option
  if (isFirstTimeAfterSetup && (portfolioError || livePortfolioError)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard 
          isLoading={false}
          error={portfolioError || livePortfolioError}
          onRetry={() => retryLoadPortfolioData(apiKeys)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeader 
        isSimulationActive={isSimulationActive}
        isPaused={simulationState?.isPaused}
        onLogout={logoutAndClearData}
        onOpenSettings={() => setShowSettings(true)}
        onRefresh={handleManualRefresh}
      />

      {/* Show first-time user info if applicable */}
      {isFirstTimeAfterSetup && (livePortfolio) && !isSimulationActive && (
        <FirstTimeUserInfo 
          onStartSimulation={handleStartSimulation}
          onOpenSettings={() => setShowSettings(true)}
          strategy={userSettings.tradingStrategy}
          aiModel={userSettings.selectedAiModelId}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <StrategyInfo 
            strategy={userSettings.tradingStrategy}
            aiModel={userSettings.selectedAiModelId}
            timeElapsed={timeElapsed}
            isSimulationActive={isSimulationActive}
          />
        </div>
        
        <div>
          <LiveStatusIndicator />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PortfolioOverviewWithStatus 
          currentValue={displayPortfolioValue}
          startValue={displayStartValue}
          totalPnL={totalPnL}
          totalPnLPercentage={totalPnLPercentage}
        />

        <ProgressTracker 
          startValue={displayStartValue}
          currentValue={displayPortfolioValue}
          progressValue={progressValue}
          isSimulationActive={isSimulationActive}
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

      {/* Live Portfolio Table - now using centralized data */}
      {livePortfolio && livePortfolio.positions.length > 0 && (
        <PortfolioTable 
          positions={livePortfolio.positions}
          totalUSDValue={livePortfolio.totalUSDValue}
        />
      )}

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
        simulationData={simulationDataForLog}
      />

      {/* Settings Drawer */}
      <SettingsDrawer 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default DashboardContent;
