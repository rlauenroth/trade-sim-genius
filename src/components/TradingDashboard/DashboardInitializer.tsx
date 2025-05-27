
import { useEffect, useState } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';

interface DashboardInitializerProps {
  onInitializationComplete: (complete: boolean) => void;
}

const DashboardInitializer = ({ onInitializationComplete }: DashboardInitializerProps) => {
  // Coordinated initialization - only initialize simReadinessStore once
  useEffect(() => {
    console.log('🔄 Starting coordinated initialization...');
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
