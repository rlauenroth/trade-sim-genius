
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
    
    // Check if essential settings are present (prioritize this over canSave())
    const hasEssentialSettings = settings.kucoin.key && settings.openRouter.apiKey;
    
    // Check canSave for verification status
    const hasValidV2Settings = canSave();
    
    // Create a simple hash of current settings to detect changes
    const settingsHash = JSON.stringify({
      kucoinKey: !!settings.kucoin.key,
      openRouterKey: !!settings.openRouter.apiKey,
      tradingMode: settings.tradingMode,
      hasEssentialSettings,
      canSave: hasValidV2Settings
    });

    console.log('Settings check:', {
      hasEssentialSettings,
      hasValidV2Settings,
      tradingMode: settings.tradingMode,
      settingsHash,
      lastSettingsCheck
    });

    // Only change onboarding state if settings actually changed
    if (settingsHash !== lastSettingsCheck) {
      setLastSettingsCheck(settingsHash);
      
      // Primary condition: If we have essential settings, show dashboard
      if (hasEssentialSettings) {
        console.log('Index: Essential settings present, showing dashboard');
        setShowOnboarding(false);
        
        // Log successful settings verification
        loggingService.logEvent('SIM', 'Settings V2 verified successfully', {
          tradingMode: settings.tradingMode,
          hasKucoinKeys: !!settings.kucoin.key,
          hasOpenRouterKey: !!settings.openRouter.apiKey
        });
      } else {
        // Only show onboarding if essential settings are missing
        console.log('Index: Essential settings missing, showing onboarding');
        setShowOnboarding(true);
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
