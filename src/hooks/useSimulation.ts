
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

export const useSimulation = () => {
  const {
    simulationState,
    isSimulationActive,
    initializeSimulation,
    updateSimulationState,
    pauseSimulation: pauseSimulationState,
    resumeSimulation: resumeSimulationState,
    stopSimulation: stopSimulationState
  } = useSimulationState();

  const {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    candidates
  } = useAISignals();

  const { activityLog, addLogEntry } = useActivityLog();
  
  // Use centralized settings store instead of legacy store
  const { settings } = useSettingsV2Store();
  
  // Create userSettings object from centralized store for backwards compatibility
  const userSettings = {
    tradingMode: settings.tradingMode,
    tradingStrategy: settings.tradingStrategy,
    riskLimits: settings.riskLimits,
    openRouterApiKey: settings.openRouter.apiKey,
    proxyUrl: settings.proxyUrl,
    selectedAiModelId: settings.model.id,
    isRealTradingEnabled: settings.tradingMode === 'real',
    maxConcurrentTrades: settings.riskLimits.maxOpenOrders,
    tradeAllBalance: false,
    maxUsdPerTrade: settings.riskLimits.maxExposure
  };

  // Create apiKeys object from centralized store for backwards compatibility
  const apiKeys = {
    kucoin: {
      key: settings.kucoin.key,
      secret: settings.kucoin.secret,
      passphrase: settings.kucoin.passphrase
    },
    openRouter: settings.openRouter.apiKey
  };

  const { autoModeError } = useAutoTradeExecution();
  const { acceptSignal: acceptSignalAction, ignoreSignal: ignoreSignalAction } = useSignalProcessor();
  const { aiGenerationTimer, setAiGenerationTimer, updateTimerInterval, clearTimer } = useSimulationTimers();
  
  const { trackApiCall, logPerformanceReport } = usePerformanceMonitoring();

  // Add portfolio evaluation hook
  const { triggerEvaluation } = usePortfolioEvaluation(
    simulationState,
    isSimulationActive,
    updateSimulationState
  );

  // Use extracted hooks
  const { handleProcessSignal } = useEnhancedSignalProcessor(
    simulationState,
    isSimulationActive,
    updateSimulationState,
    pauseSimulationState,
    addLogEntry,
    setCurrentSignal
  );

  const { 
    startSimulation, 
    stopSimulation, 
    pauseSimulation, 
    resumeSimulation 
  } = useSimulationLifecycle(
    clearTimer,
    setCurrentSignal,
    setAvailableSignals,
    initializeSimulation,
    updateSimulationState,
    pauseSimulationState,
    resumeSimulationState,
    stopSimulationState,
    startAISignalGeneration,
    addLogEntry
  );

  const { portfolioHealthStatus } = usePortfolioHealthMonitor(simulationState, userSettings);

  // Enhanced signal processing wrapper
  const processSignal = useCallback(async (signal: Signal) => {
    await handleProcessSignal(signal, userSettings);
  }, [handleProcessSignal, userSettings]);

  // Update timer interval - centralized timer management
  useEffect(() => {
    console.log('🔄 Timer update effect triggered:', { isSimulationActive, simulationState: simulationState?.isActive });
    updateTimerInterval(
      isSimulationActive,
      true, // Always automatic mode
      simulationState,
      startAISignalGeneration,
      addLogEntry
    );
  }, [updateTimerInterval, isSimulationActive, simulationState?.isActive, simulationState?.isPaused, startAISignalGeneration, addLogEntry]);

  // Accept signal manually (kept for compatibility but simplified)
  const acceptSignal = useCallback(async (signal: Signal) => {
    await acceptSignalAction(
      signal,
      simulationState,
      updateSimulationState,
      addLogEntry,
      setCurrentSignal
    );
  }, [acceptSignalAction, simulationState, updateSimulationState, addLogEntry, setCurrentSignal]);

  // Ignore signal (kept for compatibility but simplified)
  const ignoreSignal = useCallback((signal: Signal) => {
    ignoreSignalAction(signal, addLogEntry, setCurrentSignal);
  }, [ignoreSignalAction, addLogEntry, setCurrentSignal]);

  // Enhanced lifecycle methods with extracted logic
  const enhancedStartSimulation = useCallback(async (portfolioData: any) => {
    await startSimulation(portfolioData, userSettings, apiKeys);
  }, [startSimulation, userSettings, apiKeys]);

  const enhancedResumeSimulation = useCallback(async () => {
    await resumeSimulation(userSettings, apiKeys);
  }, [resumeSimulation, userSettings, apiKeys]);

  return {
    simulationState,
    isSimulationActive,
    startSimulation: enhancedStartSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation: enhancedResumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    availableSignals,
    activityLog,
    candidates,
    autoModeError,
    processSignal,
    portfolioHealthStatus,
    trackApiCall,
    logPerformanceReport,
    triggerPortfolioEvaluation: triggerEvaluation
  };
};
