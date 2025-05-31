
import { useCallback } from 'react';
import { loggingService } from '@/services/loggingService';

interface HandlerDependencies {
  currentSignal: any;
  userSettings: any;
  shouldUsePinAuth: boolean;
  requirePinVerification: () => boolean;
  acceptSignal: (signal: any) => void;
  ignoreSignal: (signal: any) => void;
  updateTradingMode: (mode: 'simulation' | 'real') => Promise<void>;
}

export const useTradingDashboardHandlers = ({
  currentSignal,
  userSettings,
  shouldUsePinAuth,
  requirePinVerification,
  acceptSignal,
  ignoreSignal,
  updateTradingMode
}: HandlerDependencies) => {
  // Handle accept signal with PIN verification if needed
  const handleAcceptSignal = useCallback(() => {
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
  }, [currentSignal, shouldUsePinAuth, requirePinVerification, acceptSignal, userSettings?.tradingMode]);

  const handleIgnoreSignal = useCallback(() => {
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
  }, [currentSignal, ignoreSignal]);

  // Handle reset to simulation mode - now properly async
  const handleResetToSimulation = useCallback(async () => {
    try {
      await updateTradingMode('simulation');
      loggingService.logEvent('SIM', 'Reset to simulation mode from error boundary');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset to simulation mode:', error);
      window.location.reload();
    }
  }, [updateTradingMode]);

  return {
    handleAcceptSignal,
    handleIgnoreSignal,
    handleResetToSimulation
  };
};
