
import React, { useState } from 'react';
import DashboardInitializer from './TradingDashboard/DashboardInitializer';
import DashboardContent from './TradingDashboard/DashboardContent';
import { useDashboardStateManager } from './TradingDashboard/DashboardStateManager';
import RealTradingErrorBoundary from './TradingDashboard/RealTradingErrorBoundary';
import { TradingDashboardErrorBoundary } from './TradingDashboard/TradingDashboardErrorBoundary';
import { PinSetupModal } from '@/components/ui/pin-setup-modal';
import { PinVerificationModal } from '@/components/ui/pin-verification-modal';
import { usePinAuthentication } from '@/hooks/usePinAuthentication';
import { loggingService } from '@/services/loggingService';

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

  // Only use PIN authentication if in real trading mode
  const shouldUsePinAuth = userSettings?.tradingMode === 'real';
  
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

  console.log('TradingDashboard render:', {
    tradingMode: userSettings?.tradingMode,
    shouldUsePinAuth,
    showPinSetup,
    showPinVerification,
    isAuthenticated,
    userSettings: !!userSettings
  });

  // Wrap acceptSignal and ignoreSignal to handle current signal automatically
  const handleAcceptSignal = () => {
    if (currentSignal) {
      try {
        // Check PIN authentication for real trading only if PIN auth is enabled
        if (shouldUsePinAuth && !requirePinVerification()) {
          loggingService.logEvent('TRADE', 'PIN verification required for real trading signal acceptance');
          return; // PIN verification required but not authenticated
        }
        
        acceptSignal(currentSignal);
        loggingService.logEvent('TRADE', 'Signal accepted', {
          signalType: currentSignal.signalType,
          pair: currentSignal.pair,
          tradingMode: userSettings?.tradingMode
        });
      } catch (error) {
        console.error('Error accepting signal:', error);
        loggingService.logError('Signal acceptance failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          signalId: currentSignal.id
        });
      }
    }
  };

  const handleIgnoreSignal = () => {
    if (currentSignal) {
      try {
        ignoreSignal(currentSignal);
        loggingService.logEvent('TRADE', 'Signal ignored', {
          signalType: currentSignal.signalType,
          pair: currentSignal.pair
        });
      } catch (error) {
        console.error('Error ignoring signal:', error);
        loggingService.logError('Signal ignore failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          signalId: currentSignal.id
        });
      }
    }
  };

  return (
    <TradingDashboardErrorBoundary>
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

        {/* PIN Authentication Modals - Only show if in real trading mode */}
        {shouldUsePinAuth && (
          <>
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
          </>
        )}
      </RealTradingErrorBoundary>
    </TradingDashboardErrorBoundary>
  );
};

export default TradingDashboard;
