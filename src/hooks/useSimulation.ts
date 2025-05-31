import { useCallback, useEffect } from 'react';
import { Signal } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useSignalProcessor } from './useSignalProcessor';
import { useSimulationTimers } from './useSimulationTimers';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { usePortfolioEvaluation } from './usePortfolioEvaluation';
import { useEnhancedSignalProcessor } from './useEnhancedSignalProcessor';
import { useSimulationLifecycle } from './useSimulationLifecycle';
import { usePortfolioHealthMonitor } from './usePortfolioHealthMonitor';
import { useEnhancedSimulation } from './useEnhancedSimulation';

export const useSimulation = () => {
  // Delegate to enhanced simulation for better functionality
  const enhancedSimulation = useEnhancedSimulation();
  
  // Keep existing interface for backward compatibility
  return {
    simulationState: enhancedSimulation.simulationState,
    isSimulationActive: enhancedSimulation.isSimulationActive,
    startSimulation: enhancedSimulation.startSimulation,
    stopSimulation: enhancedSimulation.stopSimulation,
    pauseSimulation: enhancedSimulation.pauseSimulation,
    resumeSimulation: enhancedSimulation.resumeSimulation,
    acceptSignal: enhancedSimulation.acceptSignal,
    ignoreSignal: enhancedSimulation.ignoreSignal,
    currentSignal: enhancedSimulation.currentSignal,
    availableSignals: enhancedSimulation.availableSignals,
    activityLog: enhancedSimulation.activityLog,
    candidates: enhancedSimulation.candidates,
    autoModeError: enhancedSimulation.autoModeError,
    
    // Additional enhanced features
    processSignal: async (signal: Signal) => {
      console.log('🔄 Processing signal via enhanced simulation');
      await enhancedSimulation.acceptSignal(signal);
    },
    portfolioHealthStatus: 'healthy', // Simplified to string
    trackApiCall: () => {}, // Handled by enhanced timer
    logPerformanceReport: () => {
      console.log('📊 Enhanced simulation performance:', enhancedSimulation.timerState);
    },
    triggerPortfolioEvaluation: async () => {
      await enhancedSimulation.manualSignalGeneration();
    },
    
    // Enhanced-specific features for UI
    signalState: enhancedSimulation.signalState,
    forceSignalReset: enhancedSimulation.forceSignalReset,
    getStateReport: enhancedSimulation.getStateReport
  };
};

// Export enhanced simulation directly for components that need it
export { useEnhancedSimulation } from './useEnhancedSimulation';
