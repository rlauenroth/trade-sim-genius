
import React from 'react';
import PortfolioOverviewWithStatus from '../PortfolioOverviewWithStatus';
import ControlCenter from '../ControlCenter';
import ProgressTracker from '../ProgressTracker';
import OpenPositions from '../OpenPositions';
import PerformanceMetrics from '../PerformanceMetrics';
import ActivityLog from '../ActivityLog';

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
  availableSignals?: any[];
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
  apiKeys,
  availableSignals = []
}: DashboardGridsProps) => {
  // Ensure portfolioHealthStatus matches the expected type
  const normalizeHealthStatus = (status: string): 'HEALTHY' | 'WARNING' | 'CRITICAL' => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'HEALTHY' || upperStatus === 'WARNING' || upperStatus === 'CRITICAL') {
      return upperStatus as 'HEALTHY' | 'WARNING' | 'CRITICAL';
    }
    return 'HEALTHY'; // Default fallback
  };

  return (
    <div className="space-y-6">
      {/* Main 2-column grid for core components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            startValue={displayStartValue}
            currentValue={displayPortfolioValue}
            progressValue={progressValue}
            isSimulationActive={isSimulationActive}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <OpenPositions
            positions={simulationState?.openPositions || []}
          />
          
          <PerformanceMetrics portfolioHealthStatus={normalizeHealthStatus(portfolioHealthStatus)} />
        </div>
      </div>

      {/* ActivityLog in full width below everything */}
      <div className="w-full">
        <ActivityLog
          activityLog={activityLog}
          simulationData={simulationDataForLog}
        />
      </div>
    </div>
  );
};

export default DashboardGrids;
