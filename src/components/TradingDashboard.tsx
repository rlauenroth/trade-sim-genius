import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useTradingDashboardData } from '@/hooks/useTradingDashboardData';
import { useTradingDashboardEffects } from '@/hooks/useTradingDashboardEffects';
import { useSimGuard } from '@/hooks/useSimGuard';
import { usePortfolioLive } from '@/hooks/usePortfolioLive';
import { simReadinessStore } from '@/stores/simReadinessStore';
import DashboardHeader from './TradingDashboard/DashboardHeader';
import StrategyInfo from './TradingDashboard/StrategyInfo';
import PortfolioOverviewWithStatus from './TradingDashboard/PortfolioOverviewWithStatus';
import PortfolioTable from './TradingDashboard/PortfolioTable';
import ProgressTracker from './TradingDashboard/ProgressTracker';
import ControlCenter from './TradingDashboard/ControlCenter';
import SignalDisplay from './TradingDashboard/SignalDisplay';
import OpenPositions from './TradingDashboard/OpenPositions';
import ActivityLog from './TradingDashboard/ActivityLog';
import FirstTimeUserInfo from './TradingDashboard/FirstTimeUserInfo';
import PortfolioLoadingCard from './TradingDashboard/PortfolioLoadingCard';
import LiveStatusIndicator from './TradingDashboard/LiveStatusIndicator';
import SettingsDrawer from './TradingDashboard/SettingsDrawer';
import { toast } from '@/hooks/use-toast';

const TradingDashboard = () => {
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    userSettings, 
    logoutAndClearData, 
    isFirstTimeAfterSetup, 
    completeFirstTimeSetup, 
    apiKeys 
  } = useAppState();
  
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError,
    loadPortfolioData, 
    retryLoadPortfolioData 
  } = usePortfolioData();

  // New live portfolio hook
  const { snapshot: livePortfolio } = usePortfolioLive();
  
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

  const { state: readinessState, isRunningBlocked, reason } = useSimGuard();

  const {
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    hasValidSimulation
  } = useTradingDashboardData(simulationState, portfolioData, isSimulationActive);

  const { handleStartSimulation, handleOpenSettings } = useTradingDashboardEffects({
    isFirstTimeAfterSetup,
    decryptedApiKeys: apiKeys,
    portfolioData,
    loadPortfolioData,
    completeFirstTimeSetup,
    startSimulation
  });

  // Add handler for manual refresh
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    simReadinessStore.forceRefresh();
    
    toast({
      title: "Daten aktualisiert",
      description: "Portfolio und Marktdaten werden neu geladen",
    });
  }, []);

  // Calculate simulation data for activity log
  const getSimulationDataForLog = () => {
    if (!simulationState || !hasValidSimulation()) return undefined;
    
    return {
      startTime: simulationState.startTime,
      endTime: !simulationState.isActive ? Date.now() : undefined,
      startValue: simulationState.startPortfolioValue,
      currentValue: simulationState.currentPortfolioValue,
      totalPnL: getTotalPnL(),
      totalPnLPercent: getTotalPnLPercentage(),
      totalTrades: simulationState.openPositions?.length || 0
    };
  };

  // Initialize sim readiness store on mount
  useEffect(() => {
    console.log('🔄 Initializing SimReadiness system...');
    simReadinessStore.initialize();
    
    return () => {
      // Cleanup on unmount
      simReadinessStore.destroy();
    };
  }, []);

  // Show loading state while portfolio is being loaded for first-time users
  if (isFirstTimeAfterSetup && portfolioLoading) {
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
  if (isFirstTimeAfterSetup && portfolioError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PortfolioLoadingCard 
          isLoading={false}
          error={portfolioError}
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
      {isFirstTimeAfterSetup && portfolioData && !isSimulationActive && (
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
          currentValue={getDisplayPortfolioValue()}
          startValue={getDisplayStartValue()}
          totalPnL={getTotalPnL()}
          totalPnLPercentage={getTotalPnLPercentage()}
        />

        <ProgressTracker 
          startValue={getDisplayStartValue()}
          currentValue={getDisplayPortfolioValue()}
          progressValue={getProgressValue()}
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

      {/* Live Portfolio Table - only show if we have live data */}
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
        simulationData={getSimulationDataForLog()}
      />

      {/* Settings Drawer */}
      <SettingsDrawer 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default TradingDashboard;
