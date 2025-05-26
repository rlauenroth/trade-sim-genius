
import React, { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import DashboardHeader from './TradingDashboard/DashboardHeader';
import StrategyInfo from './TradingDashboard/StrategyInfo';
import PortfolioOverview from './TradingDashboard/PortfolioOverview';
import ProgressTracker from './TradingDashboard/ProgressTracker';
import ControlCenter from './TradingDashboard/ControlCenter';
import SignalDisplay from './TradingDashboard/SignalDisplay';
import OpenPositions from './TradingDashboard/OpenPositions';
import ActivityLog from './TradingDashboard/ActivityLog';

const TradingDashboard = () => {
  const { userSettings, lockApp } = useAppState();
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

  const [timeElapsed, setTimeElapsed] = useState('00:00:00');

  useEffect(() => {
    if (isSimulationActive && simulationState?.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - simulationState.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setTimeElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isSimulationActive, simulationState?.startTime]);

  const getProgressValue = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    
    const targetValue = simulationState.startPortfolioValue * 1.01; // 1% Ziel
    const currentProgress = simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
    const targetProgress = targetValue - simulationState.startPortfolioValue;
    
    return Math.min(100, Math.max(0, (currentProgress / targetProgress) * 100));
  };

  const getTotalPnL = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    return simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
  };

  const getTotalPnLPercentage = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    return ((simulationState.currentPortfolioValue - simulationState.startPortfolioValue) / simulationState.startPortfolioValue) * 100;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeader 
        isSimulationActive={isSimulationActive}
        isPaused={simulationState?.isPaused}
        onLockApp={lockApp}
      />

      <StrategyInfo 
        strategy={userSettings.tradingStrategy}
        aiModel={userSettings.selectedAiModelId}
        timeElapsed={timeElapsed}
        isSimulationActive={isSimulationActive}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PortfolioOverview 
          currentValue={simulationState?.currentPortfolioValue || 0}
          startValue={simulationState?.startPortfolioValue || 0}
          totalPnL={getTotalPnL()}
          totalPnLPercentage={getTotalPnLPercentage()}
        />

        <ProgressTracker 
          startValue={simulationState?.startPortfolioValue || 0}
          currentValue={simulationState?.currentPortfolioValue || 0}
          progressValue={getProgressValue()}
        />

        <ControlCenter 
          isSimulationActive={isSimulationActive}
          isPaused={simulationState?.isPaused}
          onStartSimulation={startSimulation}
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
