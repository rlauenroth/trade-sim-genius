
import { useEffect, useState } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

interface DashboardInitializerProps {
  onInitializationComplete: (complete: boolean) => void;
}

const DashboardInitializer = ({ onInitializationComplete }: DashboardInitializerProps) => {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { isLoading: settingsLoading } = useSettingsV2Store();

  // Coordinated initialization with settings verification
  useEffect(() => {
    console.log('🔄 Starting coordinated initialization...');
    
    // Clear all logs on app start
    loggingService.clearAllLogs();
    loggingService.logInfo('Application started', {
      timestamp: Date.now(),
      version: '1.0',
      userAgent: navigator.userAgent
    });
    
    // Wait for settings to load before proceeding
    if (!settingsLoading && !settingsLoaded) {
      console.log('✅ Settings loaded, proceeding with initialization');
      setSettingsLoaded(true);
      
      // Initialize sim readiness store after settings are available
      simReadinessStore.initialize();
      
      loggingService.logInfo('Initialization completed', {
        settingsLoaded: true,
        simReadinessInitialized: true
      });
      
      onInitializationComplete(true);
    }
    
    return () => {
      // Cleanup on unmount
      simReadinessStore.destroy();
    };
  }, [settingsLoading, settingsLoaded, onInitializationComplete]);

  // Log settings loading state changes
  useEffect(() => {
    if (settingsLoading) {
      console.log('⏳ Waiting for settings to load...');
      loggingService.logInfo('Settings loading', { isLoading: true });
    } else {
      console.log('✅ Settings loading completed');
      loggingService.logInfo('Settings loaded', { isLoading: false });
    }
  }, [settingsLoading]);

  return null; // This is a logic-only component
};

export default DashboardInitializer;
