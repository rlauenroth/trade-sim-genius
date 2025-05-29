
import { useState, useEffect, useCallback } from 'react';
import { pinService } from '@/services/pinService';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

export const usePinAuthentication = () => {
  const { settings } = useSettingsV2Store();
  const [isPinRequired, setIsPinRequired] = useState(false);
  const [isPinSetupRequired, setIsPinSetupRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);

  // Check PIN authentication status when trading mode changes
  useEffect(() => {
    if (settings.tradingMode === 'real') {
      checkPinAuthenticationStatus();
    } else {
      // Reset authentication when switching away from real trading
      setIsAuthenticated(false);
      setIsPinRequired(false);
      setIsPinSetupRequired(false);
      setShowPinSetup(false);
      setShowPinVerification(false);
    }
  }, [settings.tradingMode]);

  const checkPinAuthenticationStatus = useCallback(() => {
    if (settings.tradingMode !== 'real') {
      return;
    }

    const hasPinConfigured = pinService.hasPinConfigured();
    
    if (!hasPinConfigured) {
      // No PIN configured - need to set up
      setIsPinSetupRequired(true);
      setIsPinRequired(false);
      setIsAuthenticated(false);
      setShowPinSetup(true);
      loggingService.logEvent('SIM', 'PIN setup required for real trading mode');
    } else {
      // PIN configured - check if we need verification
      const sessionAuthenticated = sessionStorage.getItem('kiTradingApp_pinAuthenticated') === 'true';
      
      if (sessionAuthenticated && !pinService.isLocked()) {
        setIsAuthenticated(true);
        setIsPinRequired(false);
        setIsPinSetupRequired(false);
      } else {
        // Need PIN verification
        setIsPinRequired(true);
        setIsPinSetupRequired(false);
        setIsAuthenticated(false);
        setShowPinVerification(true);
        loggingService.logEvent('SIM', 'PIN verification required for real trading mode');
      }
    }
  }, [settings.tradingMode]);

  const handlePinSetupSuccess = useCallback(() => {
    setShowPinSetup(false);
    setIsPinSetupRequired(false);
    setIsPinRequired(true);
    setShowPinVerification(true);
    loggingService.logEvent('SIM', 'PIN setup completed, requesting verification');
  }, []);

  const handlePinVerificationSuccess = useCallback(() => {
    setShowPinVerification(false);
    setIsPinRequired(false);
    setIsAuthenticated(true);
    
    // Store session authentication
    sessionStorage.setItem('kiTradingApp_pinAuthenticated', 'true');
    loggingService.logEvent('SIM', 'PIN verification successful - real trading authenticated');
  }, []);

  const handleForgotPin = useCallback(() => {
    // Reset PIN and require setup again
    pinService.resetPin();
    
    // Clear session storage
    sessionStorage.removeItem('kiTradingApp_pinAuthenticated');
    
    // Reset states
    setShowPinVerification(false);
    setIsPinRequired(false);
    setIsAuthenticated(false);
    setIsPinSetupRequired(true);
    setShowPinSetup(true);
    
    loggingService.logEvent('SIM', 'PIN reset - setup required again');
  }, []);

  const closePinModals = useCallback(() => {
    setShowPinSetup(false);
    setShowPinVerification(false);
  }, []);

  // Function to trigger PIN verification manually (e.g., before executing a trade)
  const requirePinVerification = useCallback(() => {
    if (settings.tradingMode === 'real' && !isAuthenticated) {
      checkPinAuthenticationStatus();
      return false; // Not authenticated
    }
    return true; // Authenticated or not in real trading mode
  }, [settings.tradingMode, isAuthenticated, checkPinAuthenticationStatus]);

  return {
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
    checkPinAuthenticationStatus
  };
};
