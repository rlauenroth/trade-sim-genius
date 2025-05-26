
import React, { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useActivityLog } from '@/hooks/useActivityLog';
import DashboardHeader from './TradingDashboard/DashboardHeader';
import StrategyInfo from './TradingDashboard/StrategyInfo';
import PortfolioOverview from './TradingDashboard/PortfolioOverview';
import ProgressTracker from './TradingDashboard/ProgressTracker';
import ControlCenter from './TradingDashboard/ControlCenter';
import SignalDisplay from './TradingDashboard/SignalDisplay';
import OpenPositions from './TradingDashboard/OpenPositions';
import ActivityLog from './TradingDashboard/ActivityLog';
import FirstTimeUserInfo from './TradingDashboard/FirstTimeUserInfo';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const TradingDashboard = () => {
  const { userSettings, lockApp, isFirstTimeAfterSetup, completeFirstTimeSetup, decryptedApiKeys } = useAppState();
  const { portfolioData, isLoading: portfolioLoading, loadPortfolioData } = usePortfolioData();
  const { addLogEntry } = useActivityLog();
  
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

  // Load portfolio data on first mount for new users
  useEffect(() => {
    if (isFirstTimeAfterSetup && decryptedApiKeys && !portfolioData) {
      addLogEntry('INFO', 'App erfolgreich initialisiert nach Einrichtung.');
      addLogEntry('INFO', 'Lade Portfolio-Daten von KuCoin...');
      loadPortfolioData(decryptedApiKeys);
    }
  }, [isFirstTimeAfterSetup, decryptedApiKeys, portfolioData, loadPortfolioData, addLogEntry]);

  // Log successful portfolio load
  useEffect(() => {
    if (portfolioData && isFirstTimeAfterSetup) {
      addLogEntry('INFO', `KuCoin Portfolio-Daten erfolgreich geladen. Gesamtwert: $${portfolioData.totalValue.toLocaleString()} USDT.`);
      addLogEntry('INFO', `Standardstrategie '${userSettings.tradingStrategy}' und KI-Modell '${userSettings.selectedAiModelId}' geladen.`);
      addLogEntry('INFO', 'App bereit zum Start der ersten Simulation.');
    }
  }, [portfolioData, isFirstTimeAfterSetup, userSettings, addLogEntry]);

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

  const handleStartSimulation = () => {
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    startSimulation();
  };

  const handleOpenSettings = () => {
    // This would open settings - for now we'll just complete the first time setup
    if (isFirstTimeAfterSetup) {
      completeFirstTimeSetup();
    }
    // TODO: Implement settings modal/page
    addLogEntry('INFO', 'Einstellungen geöffnet (noch nicht implementiert)');
  };

  const getDisplayPortfolioValue = () => {
    if (simulationState?.currentPortfolioValue) {
      return simulationState.currentPortfolioValue;
    }
    return portfolioData?.totalValue || 0;
  };

  const getDisplayStartValue = () => {
    if (simulationState?.startPortfolioValue) {
      return simulationState.startPortfolioValue;
    }
    return portfolioData?.totalValue || 0;
  };

  // Show loading state while portfolio is being loaded for first-time users
  if (isFirstTimeAfterSetup && portfolioLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
              <div className="text-white font-medium">Portfolio-Daten werden geladen...</div>
              <div className="text-slate-400 text-sm">
                Bitte warten Sie, während wir Ihre KuCoin-Portfolio-Daten abrufen.
              </div>
            </div>
          </CardContent>
        </Card>
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
