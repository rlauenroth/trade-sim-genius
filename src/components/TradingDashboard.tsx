
import React, { useState } from 'react';
import DashboardInitializer from './TradingDashboard/DashboardInitializer';
import DashboardContent from './TradingDashboard/DashboardContent';
import ServiceStatusMonitor from './TradingDashboard/ServiceStatusMonitor';
import { useDashboardStateManager } from './TradingDashboard/DashboardStateManager';
import RealTradingErrorBoundary from './TradingDashboard/RealTradingErrorBoundary';
import { TradingDashboardErrorBoundary } from './TradingDashboard/TradingDashboardErrorBoundary';
import { TradingModeTransitionBoundary } from './TradingDashboard/TradingModeTransitionBoundary';
import { PinSetupModal } from '@/components/ui/pin-setup-modal';
import { PinVerificationModal } from '@/components/ui/pin-verification-modal';
import { usePinAuthentication } from '@/hooks/usePinAuthentication';
import { useSettingsV2Store } from '@/stores/settingsV2';
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
    portfolioHealthStatus,
    retryServiceInitialization,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  } = useDashboardStateManager();

  const { updateTradingMode } = useSettingsV2Store();

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
    userSettings: !!userSettings,
    isRealTradingMode,
    realTradingInitialized,
    realTradingError
  });

  // Handle reset to simulation mode
  const handleResetToSimulation = React.useCallback(async () => {
    try {
      await updateTradingMode('simulation');
      loggingService.logEvent('SIM', 'Reset to simulation mode from error boundary');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset to simulation mode:', error);
      window.location.reload();
    }
  }, [updateTradingMode]);

  // Wrap acceptSignal and ignoreSignal to handle current signal automatically
  const handleAcceptSignal = () => {
    if (currentSignal) {
      try {
        // Check PIN authentication for real trading only if PIN auth is enabled
        if (shouldUsePinAuth && !requirePinVerification()) {
          loggingService.logEvent('TRADE', 'PIN verification required for real trading signal acceptance');
          return;
        }
        
        acceptSignal(currentSignal);
        loggingService.logEvent('TRADE', 'Signal accepted', {
          signalType: currentSignal.signalType,
          assetPair: currentSignal.assetPair,
          tradingMode: userSettings?.tradingMode
        });
      } catch (error) {
        console.error('Error accepting signal:', error);
        loggingService.logError('Signal acceptance failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          assetPair: currentSignal.assetPair
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
          assetPair: currentSignal.assetPair
        });
      } catch (error) {
        console.error('Error ignoring signal:', error);
        loggingService.logError('Signal ignore failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          assetPair: currentSignal.assetPair
        });
      }
    }
  };

  return (
    <TradingDashboardErrorBoundary>
      <TradingModeTransitionBoundary 
        tradingMode={userSettings?.tradingMode || 'simulation'}
        onRetry={() => window.location.reload()}
        onResetToSimulation={handleResetToSimulation}
      >
        <RealTradingErrorBoundary tradingMode={userSettings?.tradingMode || 'simulation'}>
          <DashboardInitializer 
            onInitializationComplete={setInitializationComplete}
          />
          
          <div className="flex gap-4">
            <div className="flex-1">
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
            </div>
            
            {/* Service Status Monitor - only show in real trading mode or if there are issues */}
            {(isRealTradingMode || realTradingError) && (
              <div className="w-80">
                <ServiceStatusMonitor onRetryService={retryServiceInitialization} />
              </div>
            )}
          </div>

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
      </TradingModeTransitionBoundary>
    </TradingDashboardErrorBoundary>
  );
};

export default TradingDashboard;
