
import React, { useState } from 'react';
import DashboardInitializer from './TradingDashboard/DashboardInitializer';
import DashboardContent from './TradingDashboard/DashboardContent';
import { useDashboardStateManager } from './TradingDashboard/DashboardStateManager';
import RealTradingErrorBoundary from './TradingDashboard/RealTradingErrorBoundary';
import { PinSetupModal } from '@/components/ui/pin-setup-modal';
import { PinVerificationModal } from '@/components/ui/pin-verification-modal';
import { usePinAuthentication } from '@/hooks/usePinAuthentication';

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
    candidates,
    timeElapsed,
    getProgressValue,
    getTotalPnL,
    getTotalPnLPercentage,
    getDisplayPortfolioValue,
    getDisplayStartValue,
    handleStartSimulation,
    handleManualRefresh,
    getSimulationDataForLog,
    portfolioHealthStatus
  } = useDashboardStateManager();

  const {
    isPinRequired,
    isPinSetupRequired,
    isAuthenticated,
    showPinSetup,
    showPinVerification,
    handlePinSetupSuccess,
    handlePinVerificationSuccess,
    handleForgotPin,
    closePinModals,
    requirePinVerification
  } = usePinAuthentication();

  // Wrap acceptSignal and ignoreSignal to handle current signal automatically
  const handleAcceptSignal = () => {
    if (currentSignal) {
      // Check PIN authentication for real trading
      if (userSettings?.tradingMode === 'real' && !requirePinVerification()) {
        return; // PIN verification required but not authenticated
      }
      acceptSignal(currentSignal);
    }
  };

  const handleIgnoreSignal = () => {
    if (currentSignal) {
      ignoreSignal(currentSignal);
    }
  };

  return (
    <RealTradingErrorBoundary tradingMode={userSettings?.tradingMode || 'simulation'}>
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
        candidates={candidates}
        timeElapsed={timeElapsed}
        displayPortfolioValue={getDisplayPortfolioValue()}
        displayStartValue={getDisplayStartValue()}
        totalPnL={getTotalPnL()}
        totalPnLPercentage={getTotalPnLPercentage()}
        progressValue={getProgressValue()}
        simulationDataForLog={getSimulationDataForLog()}
        autoTradeCount={simulationState?.autoTradeCount}
        portfolioHealthStatus={portfolioHealthStatus}
        logoutAndClearData={logoutAndClearData}
        handleManualRefresh={handleManualRefresh}
        handleStartSimulation={handleStartSimulation}
        pauseSimulation={pauseSimulation}
        resumeSimulation={resumeSimulation}
        stopSimulation={stopSimulation}
        acceptSignal={handleAcceptSignal}
        ignoreSignal={handleIgnoreSignal}
        retryLoadPortfolioData={retryLoadPortfolioData}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />

      {/* PIN Authentication Modals */}
      <PinSetupModal
        isOpen={showPinSetup}
        onClose={closePinModals}
        onSuccess={handlePinSetupSuccess}
      />

      <PinVerificationModal
        isOpen={showPinVerification}
        onClose={closePinModals}
        onSuccess={handlePinVerificationSuccess}
        onForgotPin={handleForgotPin}
      />
    </RealTradingErrorBoundary>
  );
};

export default TradingDashboard;
