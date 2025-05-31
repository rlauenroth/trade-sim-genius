

import React from 'react';
import PortfolioOverview from '../PortfolioOverview';
import SignalDisplay from '../SignalDisplay';
import ActivityLog from '../ActivityLog';
import PerformanceMonitoringSection from './PerformanceMonitoringSection';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

// FIXED: Create local SimulationControls component since import is missing
const SimulationControls = ({ 
  simulationState, 
  isSimulationActive, 
  isPaused, 
  onStartSimulation, 
  onPauseSimulation, 
  onResumeSimulation, 
  onStopSimulation,
  autoTradeCount,
  candidates,
  userSettings,
  apiKeys 
}: any) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
    <h3 className="text-lg font-semibold text-white mb-4">Simulation Controls</h3>
    <div className="flex gap-2">
      {!isSimulationActive && (
        <button 
          onClick={onStartSimulation}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Start
        </button>
      )}
      {isSimulationActive && !isPaused && (
        <button 
          onClick={onPauseSimulation}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
        >
          Pause
        </button>
      )}
      {isSimulationActive && isPaused && (
        <button 
          onClick={onResumeSimulation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Resume
        </button>
      )}
      {isSimulationActive && (
        <button 
          onClick={onStopSimulation}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Stop
        </button>
      )}
    </div>
    {autoTradeCount && (
      <div className="mt-2 text-sm text-slate-400">
        Auto-Trades: {autoTradeCount}
      </div>
    )}
  </div>
);

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
        currentValue={displayPortfolioValue}
        startValue={displayStartValue}
        totalPnL={totalPnL}
        totalPnLPercentage={totalPnLPercentage}
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
        portfolioValue={displayPortfolioValue}
      />

      <div className="lg:col-span-2">
        <ActivityLog
          activityLog={activityLog}
          simulationData={simulationDataForLog}
        />
      </div>
    </div>
  );
};

export default DashboardGrids;

