
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
import { useCircuitBreakerOptimized } from './useCircuitBreakerOptimized';
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
  const { aiGenerationTimer, setAiGenerationTimer, updateTimerInterval, clearTimer } = useSimulationTimers();
  
  // New integrated modules with optimized circuit breaker
  const { startExitScreening, stopExitScreening } = useExitScreening();
  const { enforceRiskLimitsOptimized, getPortfolioHealthStatus, liquidateAllPositions } = useCircuitBreakerOptimized();
  const { trackApiCall, trackSimulationCycle, logPerformanceReport } = usePerformanceMonitoring();

  // Enhanced signal processing with optimized circuit breaker (only force check after trades)
  const handleProcessSignal = useCallback(async (signal: Signal) => {
    const cycleStartTime = Date.now();
    const portfolioValueBefore = simulationState?.currentPortfolioValue || 0;

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

    // Only check risk limits AFTER trade execution (force check)
    if (simulationState && userSettings.tradingStrategy) {
      const riskLimitReached = enforceRiskLimitsOptimized(
        simulationState,
        userSettings.tradingStrategy,
        () => {
          // Enhanced pause with position liquidation on drawdown breach
          if (simulationState) {
            const liquidatedState = liquidateAllPositions(simulationState, addLogEntry);
            updateSimulationState(liquidatedState);
          }
          pauseSimulationState();
        },
        addLogEntry,
        true // Force check after trade
      );
    }

    // Track simulation cycle performance
    const cycleEndTime = Date.now();
    const portfolioValueAfter = simulationState?.currentPortfolioValue || portfolioValueBefore;
    trackSimulationCycle(cycleStartTime, cycleEndTime, portfolioValueBefore, portfolioValueAfter);
  }, [processSignal, userSettings, isSimulationActive, simulationState, setCurrentSignal, executeAutoTrade, updateSimulationState, addLogEntry, enforceRiskLimitsOptimized, pauseSimulationState, trackSimulationCycle, liquidateAllPositions]);

  // Enhanced start simulation with exit screening
  const startSimulation = useCallback(async (portfolioData: any) => {
    await startSimulationAction(
      portfolioData,
      userSettings,
      initializeSimulation,
      startAISignalGeneration,
      addLogEntry,
      updateSimulationState
    );

    // Start exit screening for open positions
    if (apiKeys?.openRouter && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          userSettings.tradingStrategy,
          apiKeys,
          updateSimulationState,
          addLogEntry
        );
      }
    }

    addLogEntry('SIM', '🔄 Exit-Screening und optimiertes Risk-Management aktiviert');
  }, [startSimulationAction, userSettings, initializeSimulation, startAISignalGeneration, addLogEntry, updateSimulationState, startExitScreening, apiKeys]);

  // Update timer interval - centralized timer management (REMOVED excessive risk checks)
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

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
    stopExitScreening();
    stopSimulationAction(
      clearTimer,
      setCurrentSignal,
      setAvailableSignals,
      stopSimulationState,
      addLogEntry
    );
    logPerformanceReport();
  }, [stopExitScreening, stopSimulationAction, clearTimer, setCurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, logPerformanceReport]);

  // Enhanced pause simulation
  const pauseSimulation = useCallback(() => {
    stopExitScreening();
    pauseSimulationAction(
      clearTimer,
      pauseSimulationState,
      addLogEntry
    );
  }, [stopExitScreening, pauseSimulationAction, clearTimer, pauseSimulationState, addLogEntry]);

  // Enhanced resume simulation
  const resumeSimulation = useCallback(async () => {
    await resumeSimulationAction(
      resumeSimulationState,
      addLogEntry,
      startAISignalGeneration,
      updateSimulationState
    );

    // Restart exit screening
    if (apiKeys?.openRouter && userSettings.tradingStrategy) {
      const currentState = JSON.parse(localStorage.getItem('kiTradingApp_simulationState') || '{}');
      if (currentState && currentState.openPositions?.length > 0) {
        startExitScreening(
          currentState,
          userSettings.tradingStrategy,
          apiKeys,
          updateSimulationState,
          addLogEntry
        );
      }
    }
  }, [resumeSimulationAction, resumeSimulationState, addLogEntry, startAISignalGeneration, updateSimulationState, startExitScreening, apiKeys, userSettings]);

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

  // Get portfolio health status (optimized - no frequent calls)
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
