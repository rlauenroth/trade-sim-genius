import React from 'react';
import ActivityLog from './ActivityLog';
import SettingsDrawer from './SettingsDrawer';
import LoadingErrorStates from './sections/LoadingErrorStates';
import DashboardHeaderSection from './sections/DashboardHeader';
import DashboardGrids from './sections/DashboardGrids';
import DashboardTrading from './sections/DashboardTrading';
import PerformanceMetrics from './PerformanceMetrics';

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
  candidates: any[];
  
  // Display values
  timeElapsed: string;
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  simulationDataForLog: any;
  autoTradeCount?: number;
  autoModeError?: string;
  portfolioHealthStatus?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  
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
  candidates,
  timeElapsed,
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  simulationDataForLog,
  autoTradeCount,
  autoModeError,
  portfolioHealthStatus = 'HEALTHY',
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
  // Check for loading/error states first
  const loadingErrorComponent = (
    <LoadingErrorStates
      isFirstTimeAfterSetup={isFirstTimeAfterSetup}
      portfolioLoading={portfolioLoading}
      livePortfolioLoading={livePortfolioLoading}
      portfolioError={portfolioError}
      livePortfolioError={livePortfolioError}
      apiKeys={apiKeys}
      onRetry={retryLoadPortfolioData}
    />
  );

  if (loadingErrorComponent) {
    const shouldShowLoadingError = 
      (isFirstTimeAfterSetup && (portfolioLoading || livePortfolioLoading)) ||
      (isFirstTimeAfterSetup && (portfolioError || livePortfolioError));
    
    if (shouldShowLoadingError) {
      return loadingErrorComponent;
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeaderSection
        isSimulationActive={isSimulationActive}
        isPaused={simulationState?.isPaused}
        isFirstTimeAfterSetup={isFirstTimeAfterSetup}
        livePortfolio={livePortfolio}
        userSettings={userSettings}
        onLogout={logoutAndClearData}
        onRefresh={handleManualRefresh}
        onStartSimulation={handleStartSimulation}
        onOpenSettings={() => setShowSettings(true)}
      />

      <DashboardGrids
        userSettings={userSettings}
        timeElapsed={timeElapsed}
        isSimulationActive={isSimulationActive}
        simulationState={simulationState}
        displayPortfolioValue={displayPortfolioValue}
        displayStartValue={displayStartValue}
        totalPnL={totalPnL}
        totalPnLPercentage={totalPnLPercentage}
        progressValue={progressValue}
        livePortfolio={livePortfolio}
        onStartSimulation={handleStartSimulation}
        onPauseSimulation={pauseSimulation}
        onResumeSimulation={resumeSimulation}
        onStopSimulation={stopSimulation}
        autoTradeCount={autoTradeCount}
        autoModeError={autoModeError}
      />

      <DashboardTrading
        currentSignal={currentSignal}
        candidates={candidates}
        simulationState={simulationState}
        onAcceptSignal={acceptSignal}
        onIgnoreSignal={ignoreSignal}
      />

      {/* Performance Metrics - Only show during active simulation */}
      {isSimulationActive && (
        <PerformanceMetrics portfolioHealthStatus={portfolioHealthStatus} />
      )}

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
