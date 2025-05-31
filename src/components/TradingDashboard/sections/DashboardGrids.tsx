
import React from 'react';
import PortfolioOverview from '../PortfolioOverview';
import SimulationControls from '../SimulationControls';
import SignalDisplay from '../SignalDisplay';
import ActivityLog from '../ActivityLog';
import PerformanceMonitoringSection from './PerformanceMonitoringSection';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface DashboardGridsProps {
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  portfolioHealthStatus: string;
  simulationState: any;
  isSimulationActive: boolean;
  isPaused: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  autoTradeCount?: number;
  candidates: any[];
  openPositions: any[];
  currentSignal: any;
  availableSignals: any[];
  onAcceptSignal: () => void;
  onIgnoreSignal: () => void;
  activityLog: any[];
  simulationDataForLog: any;
  userSettings: any;
  apiKeys: any;
}

const DashboardGrids = ({
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  portfolioHealthStatus,
  simulationState,
  isSimulationActive,
  isPaused,
  onStartSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStopSimulation,
  autoTradeCount,
  candidates,
  openPositions,
  currentSignal,
  availableSignals,
  onAcceptSignal,
  onIgnoreSignal,
  activityLog,
  simulationDataForLog,
  userSettings,
  apiKeys
}: DashboardGridsProps) => {
  const { metrics } = usePerformanceMonitoring();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <PortfolioOverview
        portfolioValue={displayPortfolioValue}
        startValue={displayStartValue}
        totalPnL={totalPnL}
        totalPnLPercentage={totalPnLPercentage}
        progressValue={progressValue}
        healthStatus={portfolioHealthStatus}
        openPositions={openPositions}
      />

      <SimulationControls
        simulationState={simulationState}
        isSimulationActive={isSimulationActive}
        isPaused={isPaused}
        onStartSimulation={onStartSimulation}
        onPauseSimulation={onPauseSimulation}
        onResumeSimulation={onResumeSimulation}
        onStopSimulation={onStopSimulation}
        autoTradeCount={autoTradeCount}
        candidates={candidates}
        userSettings={userSettings}
        apiKeys={apiKeys}
      />

      <PerformanceMonitoringSection
        metrics={metrics}
        isSimulationActive={isSimulationActive}
      />

      <SignalDisplay
        currentSignal={currentSignal}
        availableSignals={availableSignals}
        onAcceptSignal={onAcceptSignal}
        onIgnoreSignal={onIgnoreSignal}
        isSimulationActive={isSimulationActive}
        candidates={candidates}
      />

      <div className="lg:col-span-2">
        <ActivityLog
          activityLog={activityLog}
          simulationDataForLog={simulationDataForLog}
        />
      </div>
    </div>
  );
};

export default DashboardGrids;
