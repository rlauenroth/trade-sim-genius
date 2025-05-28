import React from 'react';
import PortfolioOverviewWithStatus from '../PortfolioOverviewWithStatus';
import ControlCenter from '../ControlCenter';
import ProgressTracker from '../ProgressTracker';
import CandidateList from '../CandidateList';
import SignalDisplay from '../SignalDisplay';
import ActivityLog from '../ActivityLog';
import OpenPositions from '../OpenPositions';
import PerformanceMetrics from '../PerformanceMetrics';

interface DashboardGridsProps {
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  portfolioHealthStatus: string;
  simulationState: any;
  isSimulationActive: boolean;
  isPaused?: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  autoTradeCount?: number;
  candidates: any[];
  openPositions: any[];
  currentSignal: any;
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
  onAcceptSignal,
  onIgnoreSignal,
  activityLog,
  simulationDataForLog,
  userSettings,
  apiKeys
}: DashboardGridsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        <PortfolioOverviewWithStatus
          currentValue={displayPortfolioValue}
          startValue={displayStartValue}
          totalPnL={totalPnL}
          totalPnLPercentage={totalPnLPercentage}
        />
        
        <ControlCenter
          isSimulationActive={isSimulationActive}
          isPaused={isPaused}
          onStartSimulation={onStartSimulation}
          onPauseSimulation={onPauseSimulation}
          onResumeSimulation={onResumeSimulation}
          onStopSimulation={onStopSimulation}
          autoTradeCount={autoTradeCount}
        />
        
        <ProgressTracker
          progressValue={progressValue}
          portfolioHealthStatus={portfolioHealthStatus}
        />
      </div>

      {/* Middle Column */}
      <div className="space-y-6">
        <CandidateList 
          candidates={candidates} 
          openPositions={openPositions}
        />
        
        <SignalDisplay
          currentSignal={currentSignal}
          onAcceptSignal={onAcceptSignal}
          onIgnoreSignal={onIgnoreSignal}
        />
        
        <PerformanceMetrics />
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 xl:col-span-1 space-y-6">
        <ActivityLog
          activityLog={activityLog}
          simulationData={simulationDataForLog}
        />
        
        <OpenPositions
          positions={simulationState?.openPositions || []}
        />
      </div>
    </div>
  );
};

export default DashboardGrids;
