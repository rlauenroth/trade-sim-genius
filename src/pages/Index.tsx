
import React, { useState, useEffect } from 'react';
import TradingDashboard from '@/components/TradingDashboard';
import { Loader2 } from 'lucide-react';
import SettingsManagerV2 from '@/components/settingsV2/SettingsManagerV2';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

const Index = () => {
  const { canSave, isLoading, settings } = useSettingsV2Store();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lastSettingsCheck, setLastSettingsCheck] = useState<string>('');

  useEffect(() => {
    console.log('Index component mounted, checking V2 setup status...');
    
    // Check if V2 settings are properly configured
    const hasValidV2Settings = canSave();
    
    // Check if user has any data at all (to distinguish between new user and migration case)
    const hasAnyData = settings.kucoin.key || settings.openRouter.apiKey;
    
    // Create a simple hash of current settings to detect changes
    const settingsHash = JSON.stringify({
      kucoinKey: !!settings.kucoin.key,
      openRouterKey: !!settings.openRouter.apiKey,
      tradingMode: settings.tradingMode,
      canSave: hasValidV2Settings
    });

    console.log('Settings check:', {
      hasValidV2Settings,
      hasAnyData,
      tradingMode: settings.tradingMode,
      settingsHash,
      lastSettingsCheck
    });

    // Only change onboarding state if settings actually changed
    if (settingsHash !== lastSettingsCheck) {
      setLastSettingsCheck(settingsHash);
      
      if (!hasValidV2Settings && !hasAnyData) {
        console.log('Index: New user detected, showing onboarding');
        setShowOnboarding(true);
      } else if (!hasValidV2Settings && hasAnyData) {
        console.log('Index: Incomplete settings detected, showing onboarding');
        setShowOnboarding(true);
      } else {
        console.log('Index: V2 setup complete, showing dashboard');
        setShowOnboarding(false);
        
        // Log successful settings verification
        loggingService.logEvent('SIM', 'Settings V2 verified successfully', {
          tradingMode: settings.tradingMode,
          hasKucoinKeys: !!settings.kucoin.key,
          hasOpenRouterKey: !!settings.openRouter.apiKey
        });
      }
    }
  }, [canSave, settings, lastSettingsCheck]);

  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, showing dashboard');
    setShowOnboarding(false);
    
    // Clear the settings check to force a re-evaluation
    setLastSettingsCheck('');
    
    // Log onboarding completion
    loggingService.logEvent('SIM', 'Onboarding completed successfully', {
      finalTradingMode: settings.tradingMode
    });
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
