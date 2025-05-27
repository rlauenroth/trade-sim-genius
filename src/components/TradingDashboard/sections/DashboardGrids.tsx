
import React from 'react';
import StrategyInfo from '../StrategyInfo';
import LiveStatusIndicator from '../LiveStatusIndicator';
import PortfolioOverviewWithStatus from '../PortfolioOverviewWithStatus';
import ProgressTracker from '../ProgressTracker';
import ControlCenter from '../ControlCenter';
import PortfolioTable from '../PortfolioTable';

interface DashboardGridsProps {
  userSettings: any;
  timeElapsed: string;
  isSimulationActive: boolean;
  simulationState: any;
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  livePortfolio: any;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  autoTradeCount?: number;
  autoModeError?: string;
}

const DashboardGrids = ({
  userSettings,
  timeElapsed,
  isSimulationActive,
  simulationState,
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  livePortfolio,
  onStartSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStopSimulation,
  autoTradeCount,
  autoModeError
}: DashboardGridsProps) => {
  return (
    <>
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
          onStartSimulation={onStartSimulation}
          onPauseSimulation={onPauseSimulation}
          onResumeSimulation={onResumeSimulation}
          onStopSimulation={onStopSimulation}
          autoTradeCount={autoTradeCount}
          autoModeError={autoModeError}
        />
      </div>

      {/* Live Portfolio Table - now using centralized data */}
      {livePortfolio && livePortfolio.positions.length > 0 && (
        <PortfolioTable 
          positions={livePortfolio.positions}
          totalUSDValue={livePortfolio.totalUSDValue}
        />
      )}
    </>
  );
};

export default DashboardGrids;
