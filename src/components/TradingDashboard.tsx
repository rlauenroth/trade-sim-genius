
import React from 'react';
import RealTradingErrorBoundary from './TradingDashboard/RealTradingErrorBoundary';
import { TradingDashboardErrorBoundary } from './TradingDashboard/TradingDashboardErrorBoundary';
import { TradingModeTransitionBoundary } from './TradingDashboard/TradingModeTransitionBoundary';
import TradingDashboardLayout from './TradingDashboard/TradingDashboardLayout';
import { useTradingDashboardState } from './TradingDashboard/hooks/useTradingDashboardState';
import { useTradingDashboardHandlers } from './TradingDashboard/handlers/useTradingDashboardHandlers';

const TradingDashboard = () => {
  const {
    showSettings,
    setShowSettings,
    initializationComplete,
    setInitializationComplete,
    shouldUsePinAuth,
    updateTradingMode,
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
    portfolioHealthStatus,
    retryServiceInitialization,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError,
    isPinRequired,
    isPinSetupRequired,
    isAuthenticated,
    showPinSetup,
    showPinVerification,
    handlePinSetupSuccess,
    handlePinVerificationSuccess,
    handleForgotPin,
    closePinModals,
    requirePinVerification,
    // FIXED: Use consolidated states to prevent loading loops
    isLoading,
    hasError,
    hasData,
    availableSignals
  } = useTradingDashboardState();

  const {
    handleAcceptSignal,
    handleIgnoreSignal,
    handleResetToSimulation
  } = useTradingDashboardHandlers({
    currentSignal,
    userSettings,
    shouldUsePinAuth,
    requirePinVerification,
    acceptSignal,
    ignoreSignal,
    updateTradingMode
  });

  console.log('TradingDashboard: FIXED - render:', {
    tradingMode: userSettings?.tradingMode,
    shouldUsePinAuth,
    showPinSetup,
    showPinVerification,
    isAuthenticated,
    userSettings: !!userSettings,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError,
    // FIXED: Loading state debugging
    isLoading,
    hasError: !!hasError,
    hasData: !!hasData,
    candidatesCount: candidates?.length || 0,
    availableSignalsCount: availableSignals?.length || 0
  });

  return (
    <TradingDashboardErrorBoundary>
      <TradingModeTransitionBoundary 
        tradingMode={userSettings?.tradingMode || 'simulation'}
        onRetry={() => window.location.reload()}
        onResetToSimulation={handleResetToSimulation}
      >
        <RealTradingErrorBoundary tradingMode={userSettings?.tradingMode || 'simulation'}>
          <TradingDashboardLayout
            initializationComplete={initializationComplete}
            setInitializationComplete={setInitializationComplete}
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
            availableSignals={availableSignals}
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
            retryServiceInitialization={retryServiceInitialization}
            isRealTradingMode={isRealTradingMode}
            realTradingError={realTradingError}
            shouldUsePinAuth={shouldUsePinAuth}
            showPinSetup={showPinSetup}
            showPinVerification={showPinVerification}
            handlePinSetupSuccess={handlePinSetupSuccess}
            handlePinVerificationSuccess={handlePinVerificationSuccess}
            handleForgotPin={handleForgotPin}
            closePinModals={closePinModals}
          />
        </RealTradingErrorBoundary>
      </TradingModeTransitionBoundary>
    </TradingDashboardErrorBoundary>
  );
};

export default TradingDashboard;
