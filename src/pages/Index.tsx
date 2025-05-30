
import React, { useState, useEffect } from 'react';
import TradingDashboard from '@/components/TradingDashboard';
import { Loader2, AlertTriangle } from 'lucide-react';
import SettingsManagerV2 from '@/components/settingsV2/SettingsManagerV2';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { canSave, isLoading, settings } = useSettingsV2Store();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lastSettingsCheck, setLastSettingsCheck] = useState<string>('');
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Index component mounted, checking V2 setup status...');
    
    try {
      // Check if essential settings are present (prioritize this over canSave())
      const hasEssentialSettings = settings.kucoin.key && settings.openRouter.apiKey;
      
      // Check canSave for verification status
      const hasValidV2Settings = canSave();
      
      // Validate risk limits for real trading mode
      let riskLimitsValid = true;
      if (settings.tradingMode === 'real') {
        riskLimitsValid = !!(settings.riskLimits && 
                           typeof settings.riskLimits.maxOpenOrders === 'number' &&
                           typeof settings.riskLimits.maxExposure === 'number' &&
                           typeof settings.riskLimits.minBalance === 'number');
      }

      // Create a simple hash of current settings to detect changes
      const settingsHash = JSON.stringify({
        kucoinKey: !!settings.kucoin.key,
        openRouterKey: !!settings.openRouter.apiKey,
        tradingMode: settings.tradingMode,
        hasEssentialSettings,
        canSave: hasValidV2Settings,
        riskLimitsValid,
        timestamp: settings.lastUpdated
      });

      console.log('Settings check:', {
        hasEssentialSettings,
        hasValidV2Settings,
        tradingMode: settings.tradingMode,
        riskLimitsValid,
        settingsHash,
        lastSettingsCheck
      });

      // Only change onboarding state if settings actually changed
      if (settingsHash !== lastSettingsCheck) {
        setLastSettingsCheck(settingsHash);
        
        // Clear any previous initialization errors
        setInitializationError(null);
        
        // Primary condition: If we have essential settings, show dashboard
        if (hasEssentialSettings) {
          console.log('Index: Essential settings present, showing dashboard');
          setShowOnboarding(false);
          
          // Additional validation for real trading mode
          if (settings.tradingMode === 'real' && !riskLimitsValid) {
            setInitializationError('Risk limits not properly configured for real trading mode');
            loggingService.logError('Invalid risk limits for real trading', {
              riskLimits: settings.riskLimits,
              tradingMode: settings.tradingMode
            });
          } else {
            // Log successful settings verification
            loggingService.logEvent('SIM', 'Settings V2 verified successfully', {
              tradingMode: settings.tradingMode,
              hasKucoinKeys: !!settings.kucoin.key,
              hasOpenRouterKey: !!settings.openRouter.apiKey,
              riskLimitsValid
            });
          }
        } else {
          // Only show onboarding if essential settings are missing
          console.log('Index: Essential settings missing, showing onboarding');
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown settings validation error';
      console.error('Settings validation error:', error);
      setInitializationError(errorMessage);
      loggingService.logError('Settings validation failed in Index', {
        error: errorMessage,
        timestamp: Date.now()
      });
    }
  }, [canSave, settings, lastSettingsCheck]);

  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, showing dashboard');
    setShowOnboarding(false);
    setInitializationError(null);
    
    // Clear the settings check to force a re-evaluation
    setLastSettingsCheck('');
    
    // Log onboarding completion
    loggingService.logEvent('SIM', 'Onboarding completed successfully', {
      finalTradingMode: settings.tradingMode
    });
  };

  const handleRetryInitialization = () => {
    console.log('Retrying initialization...');
    setInitializationError(null);
    setLastSettingsCheck('');
    
    // Force settings reload
    useSettingsV2Store.getState().load();
  };

  const handleResetToOnboarding = () => {
    console.log('Forcing return to onboarding...');
    setInitializationError(null);
    setShowOnboarding(true);
    setLastSettingsCheck('');
  };

  if (isLoading) {
    console.log('Index: Settings loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Lade App...</span>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initializationError && !showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-400 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Initialisierungsfehler</h2>
            </div>
            <p className="text-slate-300 mb-4">
              {initializationError}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetryInitialization} className="bg-blue-600 hover:bg-blue-700">
                Erneut versuchen
              </Button>
              <Button onClick={handleResetToOnboarding} variant="outline" className="border-slate-600">
                Einstellungen überprüfen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showOnboarding) {
    console.log('Index: Rendering onboarding');
    return (
      <div className="min-h-screen bg-gray-900">
        <SettingsManagerV2
          isOnboarding={true}
          isOpen={true}
          onClose={handleOnboardingComplete}
        />
      </div>
    );
  }

  console.log('Index: Rendering dashboard with settings:', {
    tradingMode: settings.tradingMode,
    hasKucoinKeys: !!settings.kucoin.key,
    hasOpenRouterKey: !!settings.openRouter.apiKey
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <TradingDashboard />
    </div>
  );
};

export default Index;
