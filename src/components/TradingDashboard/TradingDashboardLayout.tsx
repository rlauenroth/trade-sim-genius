
import React from 'react';
import DashboardInitializer from './DashboardInitializer';
import DashboardContent from './DashboardContent';
import ServiceStatusMonitor from './ServiceStatusMonitor';
import { PinSetupModal } from '@/components/ui/pin-setup-modal';
import { PinVerificationModal } from '@/components/ui/pin-verification-modal';

interface TradingDashboardLayoutProps {
  initializationComplete: boolean;
  setInitializationComplete: (complete: boolean) => void;
  userSettings: any;
  isFirstTimeAfterSetup: boolean;
  portfolioLoading: boolean;
  livePortfolioLoading: boolean;
  portfolioError: string | null;
  livePortfolioError: string | null;
  livePortfolio: any;
  simulationState: any;
  isSimulationActive: boolean;
  currentSignal: any;
  activityLog: any[];
  apiKeys: any;
  candidates: any[];
  timeElapsed: string;
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  simulationDataForLog: any;
  autoTradeCount?: number;
  portfolioHealthStatus: string;
  logoutAndClearData: () => void;
  handleManualRefresh: () => void;
  handleStartSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  acceptSignal: () => void;
  ignoreSignal: () => void;
  retryLoadPortfolioData: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  retryServiceInitialization: () => void;
  isRealTradingMode: boolean;
  realTradingError: any;
  shouldUsePinAuth: boolean;
  showPinSetup: boolean;
  showPinVerification: boolean;
  handlePinSetupSuccess: () => void;
  handlePinVerificationSuccess: () => void;
  handleForgotPin: () => void;
  closePinModals: () => void;
}

const TradingDashboardLayout = ({
  initializationComplete,
  setInitializationComplete,
  userSettings,
  isFirstTimeAfterSetup,
  portfolioLoading,
  livePortfolioLoading,
  portfolioError,
  livePortfolioError,
  livePortfolio,
  simulationState,
  isSimulationActive,
  currentSignal,
  activityLog,
  apiKeys,
  candidates,
  timeElapsed,
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  simulationDataForLog,
  autoTradeCount,
  portfolioHealthStatus,
  logoutAndClearData,
  handleManualRefresh,
  handleStartSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  acceptSignal,
  ignoreSignal,
  retryLoadPortfolioData,
  showSettings,
  setShowSettings,
  retryServiceInitialization,
  isRealTradingMode,
  realTradingError,
  shouldUsePinAuth,
  showPinSetup,
  showPinVerification,
  handlePinSetupSuccess,
  handlePinVerificationSuccess,
  handleForgotPin,
  closePinModals
}: TradingDashboardLayoutProps) => {
  return (
    <>
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
            displayPortfolioValue={displayPortfolioValue}
            displayStartValue={displayStartValue}
            totalPnL={totalPnL}
            totalPnLPercentage={totalPnLPercentage}
            progressValue={progressValue}
            simulationDataForLog={simulationDataForLog}
            autoTradeCount={autoTradeCount}
            portfolioHealthStatus={portfolioHealthStatus}
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
    </>
  );
};

export default TradingDashboardLayout;
