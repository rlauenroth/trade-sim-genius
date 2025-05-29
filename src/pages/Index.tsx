
import React, { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import TradingDashboard from '@/components/TradingDashboard';
import { Loader2 } from 'lucide-react';
import SettingsManagerV2 from '@/components/settingsV2/SettingsManagerV2';
import { useSettingsV2Store } from '@/stores/settingsV2Store';

const Index = () => {
  const { isSetupComplete, isLoading } = useAppState();
  const { canSave } = useSettingsV2Store();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    console.log('Index component mounted, checking setup status...');
    
    // Check if V2 settings are properly configured
    const hasValidV2Settings = canSave();
    
    if (!isSetupComplete || !hasValidV2Settings) {
      console.log('Index: Showing V2 onboarding');
      setShowOnboarding(true);
    } else {
      console.log('Index: Setup complete, showing dashboard');
      setShowOnboarding(false);
    }
  }, [isSetupComplete, canSave]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Force refresh of app state
    window.location.reload();
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
