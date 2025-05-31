import React from 'react';
import { Container } from '@/components/ui/container';
import DashboardHeaderSection from './sections/DashboardHeader';
import LoadingErrorStates from './sections/LoadingErrorStates';
import DashboardGrids from './sections/DashboardGrids';
import SettingsManagerV2 from '@/components/settingsV2/SettingsManagerV2';
import AssetPipelineMonitor from '@/components/assetPipelineMonitor/AssetPipelineMonitor';

interface DashboardContentProps {
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
  availableSignals?: any[];
  activityLog: any[];
  apiKeys: any;
  candidates: any[];
  timeElapsed: string;
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  simulationDataForLog: any;
  autoTradeCount?: number;
  portfolioHealthStatus: string;
  logoutAndClearData: () => void;
  handleManualRefresh: () => void;
  handleStartSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  acceptSignal: () => void;
  ignoreSignal: () => void;
  retryLoadPortfolioData: () => void;
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
  availableSignals = [],
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
  portfolioHealthStatus,
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
  const isPaused = simulationState?.isPaused;

  return (
    <Container className="py-8 space-y-8">
      <DashboardHeaderSection
        isSimulationActive={isSimulationActive}
        isPaused={isPaused}
        isFirstTimeAfterSetup={isFirstTimeAfterSetup}
        livePortfolio={livePortfolio}
        userSettings={userSettings}
        onLogout={logoutAndClearData}
        onRefresh={handleManualRefresh}
        onStartSimulation={handleStartSimulation}
        onOpenSettings={() => setShowSettings(true)}
      />

      <LoadingErrorStates
        isFirstTimeAfterSetup={isFirstTimeAfterSetup}
        portfolioLoading={portfolioLoading}
        livePortfolioLoading={livePortfolioLoading}
        portfolioError={portfolioError}
        livePortfolioError={livePortfolioError}
        apiKeys={apiKeys}
        onRetry={retryLoadPortfolioData}
      />

      <DashboardGrids
        displayPortfolioValue={displayPortfolioValue}
        displayStartValue={displayStartValue}
        totalPnL={totalPnL}
        totalPnLPercentage={totalPnLPercentage}
        progressValue={progressValue}
        portfolioHealthStatus={portfolioHealthStatus}
        simulationState={simulationState}
        isSimulationActive={isSimulationActive}
        isPaused={isPaused}
        onStartSimulation={handleStartSimulation}
        onPauseSimulation={pauseSimulation}
        onResumeSimulation={resumeSimulation}
        onStopSimulation={stopSimulation}
        autoTradeCount={autoTradeCount}
        candidates={candidates}
        openPositions={simulationState?.openPositions || []}
        currentSignal={currentSignal}
        availableSignals={availableSignals}
        onAcceptSignal={acceptSignal}
        onIgnoreSignal={ignoreSignal}
        activityLog={activityLog}
        simulationDataForLog={simulationDataForLog}
        userSettings={userSettings}
        apiKeys={apiKeys}
      />

      <AssetPipelineMonitor
        candidates={candidates}
        availableSignals={availableSignals}
        currentSignal={currentSignal}
        portfolioValue={displayPortfolioValue}
        isSimulationActive={isSimulationActive}
        openPositions={simulationState?.openPositions || []}
      />

      <SettingsManagerV2
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Container>
  );
};

export default DashboardContent;
