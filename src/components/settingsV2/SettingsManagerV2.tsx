import React, { useState, useEffect } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import SettingsDrawerV2 from './SettingsDrawerV2';

interface SettingsManagerV2Props {
  isOnboarding?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

const SettingsManagerV2 = ({ 
  isOnboarding = false, 
  isOpen = false, 
  onClose = () => {}, 
  children 
}: SettingsManagerV2Props) => {
  const { settings, blocks, canSave } = useSettingsV2Store();
  const [showSettings, setShowSettings] = useState(isOnboarding);

  // Auto-open settings if any block is unverified (for onboarding detection)
  useEffect(() => {
    if (!isOnboarding && !canSave()) {
      // Check if this is first time setup
      const hasAnyData = settings.kucoin.key || settings.openRouter.apiKey;
      if (!hasAnyData) {
        setShowSettings(true);
      }
    }
  }, [settings, canSave, isOnboarding]);

  const handleClose = () => {
    if (isOnboarding && !canSave()) {
      // Prevent closing during onboarding if not all verified
      return;
    }
    setShowSettings(false);
    onClose();
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  return (
    <>
      {children && (
        <div onClick={handleOpenSettings}>
          {children}
        </div>
      )}
      
      <SettingsDrawerV2
        isOpen={isOpen || showSettings}
        onClose={handleClose}
        isOnboarding={isOnboarding}
      />
    </>
  );
};

export default SettingsManagerV2;
