
import { useCallback, useEffect } from 'react';
import { Signal } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useSimulationActions } from './useSimulationActions';
import { useSignalProcessor } from './useSignalProcessor';
import { useSimulationTimers } from './useSimulationTimers';
import { useExitScreening } from './useExitScreening';
import { useCircuitBreaker } from './useCircuitBreaker';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppState } from './useAppState';

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
  const { userSettings } = useSettingsStore();
  const { apiKeys } = useAppState();

  const { executeAutoTrade, autoModeError } = useAutoTradeExecution();
  const { startSimulation: startSimulationAction, stopSimulation: stopSimulationAction, pauseSimulation: pauseSimulationAction, resumeSimulation: resumeSimulationAction } = useSimulationActions();
  const { processSignal, acceptSignal: acceptSignalAction, ignoreSignal: ignoreSignalAction } = useSignalProcessor();
  const { aiGenerationTimer, setAiGenerationTimer, updateTimerInterval } = useSimulationTimers();
  
  // New integrated modules
  const { startExitScreening, stopExitScreening } = useExitScreening();
  const { enforceRiskLimits, getPortfolioHealthStatus } = useCircuitBreaker();
  const { trackApiCall, trackSimulationCycle, logPerformanceReport } = usePerformanceMonitoring();

  // Enhanced signal processing with circuit breaker
  const handleProcessSignal = useCallback(async (signal: Signal) => {
    const cycleStartTime = Date.now();
    const portfolioValueBefore = simulationState?.currentPortfolioValue || 0;

    // Check risk limits before processing signal
    if (simulationState && userSettings.tradingStrategy) {
      const riskLimitReached = enforceRiskLimits(
        simulationState,
        userSettings.tradingStrategy,
        pauseSimulationState,
        addLogEntry
      );
      
      if (riskLimitReached) {
        return; // Stop processing if risk limits are breached
      }
    }

    await processSignal(
      signal,
      userSettings,
      isSimulationActive,
      simulationState,
      setCurrentSignal,
      executeAutoTrade,
      updateSimulationState,
      addLogEntry
    );

    // Track simulation cycle performance
    const cycleEndTime = Date.now();
    const portfolioValueAfter = simulationState?.currentPortfolioValue || portfolioValueBefore;
    trackSimulationCycle(cycleStartTime, cycleEndTime, portfolioValueBefore, portfolioValueAfter);
  }, [processSignal, userSettings, isSimulationActive, simulationState, setCurrentSignal, executeAutoTrade, updateSimulationState, addLogEntry, enforceRiskLimits, pauseSimulationState, trackSimulationCycle]);

  // Enhanced start simulation with exit screening
  const startSimulation = useCallback(async (portfolioData: any) => {
    await startSimulationAction(
      portfolioData,
      userSettings,
      initializeSimulation,
      startAISignalGeneration,
      addLogEntry,
      setAiGenerationTimer,
      updateSimulationState
    );

    // Start exit screening for open positions
    if (apiKeys?.encryptedOpenRouterKey && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          apiKeys.encryptedOpenRouterKey,
          updateSimulationState,
          addLogEntry
        );
      }
    }

    addLogEntry('SIM', '🔄 Exit-Screening und Risk-Management aktiviert');
  }, [startSimulationAction, userSettings, initializeSimulation, startAISignalGeneration, addLogEntry, setAiGenerationTimer, updateSimulationState, startExitScreening, apiKeys]);

  // Update timer interval with performance monitoring
  useEffect(() => {
    updateTimerInterval(
      isSimulationActive,
      true, // Always automatic mode
      simulationState,
      startAISignalGeneration,
      addLogEntry
    );
  }, [updateTimerInterval, isSimulationActive, simulationState, startAISignalGeneration, addLogEntry]);

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
    stopExitScreening();
    stopSimulationAction(
      aiGenerationTimer,
      setCurrentSignal,
      setAvailableSignals,
      stopSimulationState,
      addLogEntry,
      setAiGenerationTimer
    );
    logPerformanceReport();
  }, [stopExitScreening, stopSimulationAction, aiGenerationTimer, setCurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, setAiGenerationTimer, logPerformanceReport]);

  // Enhanced pause simulation
  const pauseSimulation = useCallback(() => {
    stopExitScreening();
    pauseSimulationAction(
      aiGenerationTimer,
      pauseSimulationState,
      addLogEntry,
      setAiGenerationTimer
    );
  }, [stopExitScreening, pauseSimulationAction, aiGenerationTimer, pauseSimulationState, addLogEntry, setAiGenerationTimer]);

  // Enhanced resume simulation
  const resumeSimulation = useCallback(async () => {
    await resumeSimulationAction(
      resumeSimulationState,
      addLogEntry,
      startAISignalGeneration,
      setAiGenerationTimer,
      updateSimulationState
    );

    // Restart exit screening
    if (apiKeys?.encryptedOpenRouterKey && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          apiKeys.encryptedOpenRouterKey,
          updateSimulationState,
          addLogEntry
        );
      }
    }
  }, [resumeSimulationAction, resumeSimulationState, addLogEntry, startAISignalGeneration, setAiGenerationTimer, updateSimulationState, startExitScreening, apiKeys, userSettings]);

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

  // Get portfolio health status
  const portfolioHealthStatus = simulationState && userSettings.tradingStrategy 
    ? getPortfolioHealthStatus(simulationState, userSettings.tradingStrategy)
    : 'HEALTHY';

  return {
    simulationState,
    isSimulationActive,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    availableSignals,
    activityLog,
    candidates,
    autoModeError,
    processSignal: handleProcessSignal,
    portfolioHealthStatus,
    trackApiCall,
    logPerformanceReport
  };
};
