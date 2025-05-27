
import { useCallback, useEffect } from 'react';
import { Signal } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useSimulationActions } from './useSimulationActions';
import { useSignalProcessor } from './useSignalProcessor';
import { useSimulationTimers } from './useSimulationTimers';
import { useSettingsStore } from '@/stores/settingsStore';

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

  const { executeAutoTrade, autoModeError } = useAutoTradeExecution();
  const { startSimulation: startSimulationAction, stopSimulation: stopSimulationAction, pauseSimulation: pauseSimulationAction, resumeSimulation: resumeSimulationAction } = useSimulationActions();
  const { processSignal, acceptSignal: acceptSignalAction, ignoreSignal: ignoreSignalAction } = useSignalProcessor();
  const { aiGenerationTimer, setAiGenerationTimer, updateTimerInterval } = useSimulationTimers();

  // Handle signal processing (always automatic now)
  const handleProcessSignal = useCallback(async (signal: Signal) => {
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
  }, [processSignal, userSettings, isSimulationActive, simulationState, setCurrentSignal, executeAutoTrade, updateSimulationState, addLogEntry]);

  // Start simulation with automatic mode
  const startSimulation = useCallback(async (portfolioData: any) => {
    await startSimulationAction(
      portfolioData,
      userSettings,
      initializeSimulation,
      startAISignalGeneration,
      addLogEntry,
      setAiGenerationTimer,
      simulationState
    );
  }, [startSimulationAction, userSettings, initializeSimulation, startAISignalGeneration, addLogEntry, setAiGenerationTimer, simulationState]);

  // Update timer interval - always use 30s for automatic mode
  useEffect(() => {
    updateTimerInterval(
      isSimulationActive,
      true, // Always automatic mode
      simulationState,
      startAISignalGeneration,
      addLogEntry
    );
  }, [updateTimerInterval, isSimulationActive, simulationState, startAISignalGeneration, addLogEntry]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    stopSimulationAction(
      aiGenerationTimer,
      setCurrentSignal,
      setAvailableSignals,
      stopSimulationState,
      addLogEntry,
      setAiGenerationTimer
    );
  }, [stopSimulationAction, aiGenerationTimer, setCurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, setAiGenerationTimer]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    pauseSimulationAction(
      aiGenerationTimer,
      pauseSimulationState,
      addLogEntry,
      setAiGenerationTimer
    );
  }, [pauseSimulationAction, aiGenerationTimer, pauseSimulationState, addLogEntry, setAiGenerationTimer]);

  // Resume simulation
  const resumeSimulation = useCallback(async () => {
    await resumeSimulationAction(
      resumeSimulationState,
      addLogEntry,
      simulationState,
      startAISignalGeneration,
      setAiGenerationTimer
    );
  }, [resumeSimulationAction, resumeSimulationState, addLogEntry, simulationState, startAISignalGeneration, setAiGenerationTimer]);

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
    processSignal: handleProcessSignal
  };
};
