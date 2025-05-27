
import React, { useState } from 'react';
import DashboardInitializer from './TradingDashboard/DashboardInitializer';
import DashboardContent from './TradingDashboard/DashboardContent';
import { useDashboardStateManager } from './TradingDashboard/DashboardStateManager';

const TradingDashboard = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  
  const {
    userSettings,
    logoutAndClearData,
    isFirstTimeAfterSetup,
    apiKeys,
    portfolioData,
    portfolioLoading,
    portfolioError,
    retryLoadPortfolioData,
    livePortfolio,
    livePortfolioLoading,
    livePortfolioError,
    simulationState,
    isSimulationActive,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    activityLog,
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    handleStartSimulation,
    handleManualRefresh,
    getSimulationDataForLog
  } = useDashboardStateManager();

  return (
    <>
      <DashboardInitializer 
        onInitializationComplete={setInitializationComplete}
      />
      
      <DashboardContent
        userSettings={userSettings}
        isFirstTimeAfterSetup={isFirstTimeAfterSetup}
        portfolioLoading={portfolioLoading}
        livePortfolioLoading={livePortfolioLoading}
        portfolioError={portfolioError}
        livePortfolioError={livePortfolioError}
        livePortfolio={livePortfolio}
        simulationState={simulationState}
        isSimulationActive={isSimulationActive}
        currentSignal={currentSignal}
        activityLog={activityLog}
        apiKeys={apiKeys}
        timeElapsed={timeElapsed}
        displayPortfolioValue={getDisplayPortfolioValue()}
        displayStartValue={getDisplayStartValue()}
        totalPnL={getTotalPnL()}
        totalPnLPercentage={getTotalPnLPercentage()}
        progressValue={getProgressValue()}
        simulationDataForLog={getSimulationDataForLog()}
        logoutAndClearData={logoutAndClearData}
        handleManualRefresh={handleManualRefresh}
        handleStartSimulation={handleStartSimulation}
        pauseSimulation={pauseSimulation}
        resumeSimulation={resumeSimulation}
        stopSimulation={stopSimulation}
        acceptSignal={acceptSignal}
        ignoreSignal={ignoreSignal}
        retryLoadPortfolioData={retryLoadPortfolioData}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />
    </>
  );
};

export default TradingDashboard;
