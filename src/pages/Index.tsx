import React, { useState, useEffect } from 'react';
import TradingDashboard from '@/components/TradingDashboard';
import { Loader2 } from 'lucide-react';
import SettingsManagerV2 from '@/components/settingsV2/SettingsManagerV2';
import { useSettingsV2Store } from '@/stores/settingsV2';

const Index = () => {
  const { canSave, isLoading, settings } = useSettingsV2Store();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    console.log('Index component mounted, checking V2 setup status...');
    
    // Check if V2 settings are properly configured
    const hasValidV2Settings = canSave();
    
    // Check if user has any data at all (to distinguish between new user and migration case)
    const hasAnyData = settings.kucoin.key || settings.openRouter.apiKey;
    
    if (!hasValidV2Settings) {
      console.log('Index: V2 settings not complete, showing onboarding');
      setShowOnboarding(true);
    } else {
      console.log('Index: V2 setup complete, showing dashboard');
      setShowOnboarding(false);
    }
  }, [canSave, settings]);

  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, showing dashboard');
    setShowOnboarding(false);
    // No reload needed - just update state
  };

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-900">
      <TradingDashboard />
    </div>
  );
};

export default Index;
