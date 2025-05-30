
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useSignalProcessor } from './useSignalProcessor';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useCircuitBreakerOptimized } from './useCircuitBreakerOptimized';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { usePortfolioEvaluation } from './usePortfolioEvaluation';

export const useEnhancedSignalProcessor = (
  simulationState: SimulationState | null,
  isSimulationActive: boolean,
  updateSimulationState: (state: SimulationState) => void,
  pauseSimulationState: () => void,
  addLogEntry: (type: any, message: string) => void,
  setCurrentSignal: (signal: Signal | null) => void
) => {
  const { processSignal } = useSignalProcessor();
  const { executeAutoTrade } = useAutoTradeExecution();
  const { enforceRiskLimitsOptimized, liquidateAllPositions } = useCircuitBreakerOptimized();
  const { trackSimulationCycle } = usePerformanceMonitoring();
  const { triggerEvaluation } = usePortfolioEvaluation(
    simulationState,
    isSimulationActive,
    updateSimulationState
  );

  // Direct auto-trade execution function
  const executeDirectAutoTrade = useCallback(async (
    signal: Signal,
    currentSimulationState: any,
    updateState: any,
    logEntry: any,
    userSettings: any
  ): Promise<boolean> => {
    if (!currentSimulationState || !isSimulationActive) {
      console.log('❌ Auto-trade failed: Invalid state or simulation inactive');
      return false;
    }

    try {
      console.log('🔄 Direct auto-trade execution started:', {
        signal: signal.assetPair,
        signalType: signal.signalType,
        portfolioValue: currentSimulationState.currentPortfolioValue
      });

      const success = await executeAutoTrade(
        signal,
        currentSimulationState,
        updateState,
        logEntry
      );

      if (success) {
        // Trigger portfolio evaluation after successful trade
        setTimeout(async () => {
          try {
            await triggerEvaluation();
          } catch (evalError) {
            console.log('Portfolio evaluation after trade failed:', evalError);
          }
        }, 1000);

        // Check risk limits after trade execution
        if (currentSimulationState && userSettings?.tradingStrategy) {
          const riskLimitReached = enforceRiskLimitsOptimized(
            currentSimulationState,
            userSettings.tradingStrategy,
            () => {
              if (currentSimulationState) {
                const liquidatedState = liquidateAllPositions(currentSimulationState, logEntry);
                updateState(liquidatedState);
              }
              pauseSimulationState();
            },
            logEntry,
            true
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Direct auto-trade execution failed:', error);
      logEntry('ERROR', `Auto-Trade fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      return false;
    }
  }, [executeAutoTrade, isSimulationActive, triggerEvaluation, enforceRiskLimitsOptimized, liquidateAllPositions, pauseSimulationState]);

  const handleProcessSignal = useCallback(async (
    signal: Signal,
    userSettings: any
  ) => {
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

    // Trigger portfolio evaluation after trade execution
    if (simulationState && simulationState.openPositions.length > 0) {
      await triggerEvaluation();
    }

    // Check risk limits after trade execution
    if (simulationState && userSettings.tradingStrategy) {
      const riskLimitReached = enforceRiskLimitsOptimized(
        simulationState,
        userSettings.tradingStrategy,
        () => {
          if (simulationState) {
            const liquidatedState = liquidateAllPositions(simulationState, addLogEntry);
            updateSimulationState(liquidatedState);
          }
          pauseSimulationState();
        },
        addLogEntry,
        true
      );
    }

    // Track simulation cycle performance
    const cycleEndTime = Date.now();
    const portfolioValueAfter = simulationState?.currentPortfolioValue || portfolioValueBefore;
    trackSimulationCycle(cycleStartTime, cycleEndTime, portfolioValueBefore, portfolioValueAfter);
  }, [processSignal, isSimulationActive, simulationState, setCurrentSignal, executeAutoTrade, updateSimulationState, addLogEntry, enforceRiskLimitsOptimized, pauseSimulationState, trackSimulationCycle, liquidateAllPositions, triggerEvaluation]);

  return {
    handleProcessSignal,
    executeDirectAutoTrade
  };
};
