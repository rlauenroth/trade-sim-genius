
import { useEffect, useState } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { loggingService } from '@/services/loggingService';

interface DashboardInitializerProps {
  onInitializationComplete: (complete: boolean) => void;
}

const DashboardInitializer = ({ onInitializationComplete }: DashboardInitializerProps) => {
  // Coordinated initialization - only initialize simReadinessStore once
  useEffect(() => {
    console.log('🔄 Starting coordinated initialization...');
    
    // Clear all logs on app start
    loggingService.clearAllLogs();
    loggingService.logInfo('Application started', {
      timestamp: Date.now(),
      version: '1.0',
      userAgent: navigator.userAgent
    });
    
    simReadinessStore.initialize();
    onInitializationComplete(true);
    
    return () => {
      // Cleanup on unmount
      simReadinessStore.destroy();
    };
  }, [onInitializationComplete]);

  return null; // This is a logic-only component
};

export default DashboardInitializer;
