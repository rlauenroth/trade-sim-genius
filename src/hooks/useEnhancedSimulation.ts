
import { useCallback, useEffect } from 'react';
import { Signal } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useSignalStateMachine } from './useSignalStateMachine';
import { useEnhancedSimulationTimers } from './useEnhancedSimulationTimers';
import { usePortfolioStateConsolidator } from './usePortfolioStateConsolidator';
import { useAISignals } from './useAISignals';
import { useActivityLog } from './useActivityLog';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

export const useEnhancedSimulation = () => {
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
    currentSignal: aiCurrentSignal,
    setCurrentSignal: setAICurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    candidates
  } = useAISignals();

  const {
    currentSignal: stateMachineSignal,
    signalState,
    processingLock,
    generateSignal,
    startProcessing,
    markExecuted,
    markFailed,
    forceClear,
    canGenerateNewSignal,
    getActionableSignal
  } = useSignalStateMachine();

  const {
    timerState,
    startEnhancedTimer,
    stopEnhancedTimer,
    forceExecution
  } = useEnhancedSimulationTimers();

  const {
    atomicUpdate,
    loadStateWithRepair,
    validateStateConsistency,
    getConsistencyReport
  } = usePortfolioStateConsolidator();

  const { activityLog, addLogEntry } = useActivityLog();
  const { executeAutoTrade } = useAutoTradeExecution();
  const { settings } = useSettingsV2Store();

  // Create consolidated userSettings for backward compatibility
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

  // Enhanced AI signal generation with state machine integration
  const enhancedStartAISignalGeneration = useCallback(async () => {
    if (!canGenerateNewSignal()) {
      console.log('🔒 Signal generation blocked by state machine');
      return;
    }

    console.log('🚀 Enhanced AI signal generation started');
    addLogEntry('AI', 'Erweiterte KI-Signalanalyse gestartet...');

    try {
      await startAISignalGeneration(
        isSimulationActive,
        simulationState,
        addLogEntry,
        async (signal, currentSimulationState, updateState, logEntry) => {
          // Use state machine for signal processing
          if (generateSignal(signal)) {
            if (startProcessing()) {
              try {
                const success = await executeAutoTrade(
                  signal,
                  currentSimulationState,
                  updateState,
                  logEntry
                );
                
                if (success) {
                  markExecuted();
                  return true;
                } else {
                  markFailed('Trade execution failed');
                  return false;
                }
              } catch (error) {
                markFailed(error instanceof Error ? error.message : 'Unknown error');
                return false;
              }
            }
          }
          return false;
        },
        updateSimulationState
      );
    } catch (error) {
      console.error('❌ Enhanced AI signal generation failed:', error);
      addLogEntry('ERROR', `Erweiterte KI-Analyse fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }, [
    canGenerateNewSignal, 
    startAISignalGeneration, 
    isSimulationActive, 
    simulationState, 
    addLogEntry, 
    generateSignal, 
    startProcessing, 
    executeAutoTrade, 
    markExecuted, 
    markFailed, 
    updateSimulationState
  ]);

  // Enhanced simulation lifecycle with state consolidation
  const startSimulation = useCallback(async (portfolioData: any) => {
    console.log('🚀 Enhanced simulation startup...');
    
    try {
      // Initialize with validation
      const initialState = initializeSimulation(portfolioData);
      
      if (!validateStateConsistency(initialState)) {
        throw new Error('Initial simulation state failed validation');
      }
      
      // Use atomic update for state persistence
      const updateResult = atomicUpdate(
        initialState,
        (state) => ({ ...state, isActive: true, isPaused: false }),
        'Simulation startup'
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'State update failed');
      }
      
      // Start enhanced timer
      startEnhancedTimer(
        true,
        updateResult.newState,
        enhancedStartAISignalGeneration,
        'Enhanced AI Signal Generation'
      );
      
      addLogEntry('SIM', 'Erweiterte Simulation erfolgreich gestartet');
      console.log('✅ Enhanced simulation started successfully');
      
    } catch (error) {
      console.error('❌ Enhanced simulation startup failed:', error);
      addLogEntry('ERROR', `Simulation-Start fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }, [initializeSimulation, validateStateConsistency, atomicUpdate, startEnhancedTimer, enhancedStartAISignalGeneration, addLogEntry]);

  // Enhanced stop simulation
  const stopSimulation = useCallback(() => {
    console.log('🛑 Enhanced simulation stop...');
    
    stopEnhancedTimer();
    forceClear(); // Clear signal state machine
    setAICurrentSignal(null);
    setAvailableSignals([]);
    stopSimulationState();
    
    addLogEntry('SIM', 'Erweiterte Simulation beendet');
    
    // Log final state consistency report
    const report = getConsistencyReport();
    loggingService.logEvent('SIM', 'Simulation stopped with consistency report', report);
  }, [stopEnhancedTimer, forceClear, setAICurrentSignal, setAvailableSignals, stopSimulationState, addLogEntry, getConsistencyReport]);

  // Enhanced pause/resume
  const pauseSimulation = useCallback(() => {
    stopEnhancedTimer();
    pauseSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation pausiert');
  }, [stopEnhancedTimer, pauseSimulationState, addLogEntry]);

  const resumeSimulation = useCallback(async () => {
    if (simulationState) {
      startEnhancedTimer(
        true,
        simulationState,
        enhancedStartAISignalGeneration,
        'Enhanced AI Signal Generation (Resumed)'
      );
    }
    resumeSimulationState();
    addLogEntry('SIM', 'Erweiterte Simulation fortgesetzt');
  }, [startEnhancedTimer, simulationState, enhancedStartAISignalGeneration, resumeSimulationState, addLogEntry]);

  // Timer management effect
  useEffect(() => {
    if (isSimulationActive && !simulationState?.isPaused) {
      startEnhancedTimer(
        isSimulationActive,
        simulationState,
        enhancedStartAISignalGeneration,
        'Auto Enhanced AI Generation'
      );
    } else {
      stopEnhancedTimer();
    }
  }, [isSimulationActive, simulationState?.isPaused, startEnhancedTimer, stopEnhancedTimer, enhancedStartAISignalGeneration]);

  // Get the current actionable signal (prioritize state machine)
  const currentSignal = getActionableSignal() || aiCurrentSignal;

  // Manual signal processing (compatibility)
  const acceptSignal = useCallback(async (signal: Signal) => {
    addLogEntry('INFO', `Signal manuell angenommen (Kompatibilitätsmodus): ${signal.signalType} ${signal.assetPair}`);
  }, [addLogEntry]);

  const ignoreSignal = useCallback((signal: Signal) => {
    addLogEntry('INFO', `Signal ignoriert (Kompatibilitätsmodus): ${signal.signalType} ${signal.assetPair}`);
    forceClear();
  }, [addLogEntry, forceClear]);

  return {
    // Simulation state
    simulationState,
    isSimulationActive,
    
    // Signal state
    currentSignal,
    signalState,
    availableSignals,
    candidates,
    
    // Enhanced lifecycle
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    
    // Compatibility methods
    acceptSignal,
    ignoreSignal,
    
    // Enhanced functionality
    forceSignalReset: forceClear,
    manualSignalGeneration: () => forceExecution(enhancedStartAISignalGeneration, 'Manual Trigger'),
    getStateReport: getConsistencyReport,
    
    // Logs and monitoring
    activityLog,
    timerState,
    
    // Auto-trade error state
    autoModeError: null // Handled by state machine now
  };
};
