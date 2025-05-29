
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { toast } from '@/hooks/use-toast';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useRealTradeExecution } from './trading/useRealTradeExecution';
import { useSimulatedTradeExecution } from './trading/useSimulatedTradeExecution';
import { useTradeValidation } from './trading/useTradeValidation';

export const useTradeExecution = () => {
  const { settings } = useSettingsV2Store();
  const { executeRealTrade } = useRealTradeExecution();
  const { executeSimulatedTrade } = useSimulatedTradeExecution();
  const { isTradeableSignal, executeTradeFromSignal } = useTradeValidation();

  const acceptSignal = useCallback(async (
    signal: Signal,
    simulationState: SimulationState | null,
    addLogEntry: (type: any, message: string) => void,
    saveSimulationState: (state: SimulationState) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    startAISignalGeneration: () => void,
    addTradeLog: (tradeData: any) => void,
    addSignalLog: (signal: Signal, action: 'generated' | 'accepted' | 'ignored') => void,
    addPortfolioUpdateLog: (valueBefore: number, valueAfter: number, reason: string) => void,
    strategy: string = 'balanced'
  ) => {
    if (!simulationState || !signal) return;

    loggingService.logEvent('TRADE', 'Signal acceptance started', {
      signalType: signal.signalType,
      assetPair: signal.assetPair,
      entryPrice: signal.entryPriceSuggestion,
      strategy,
      portfolioValue: simulationState.currentPortfolioValue,
      tradingMode: settings.tradingMode
    });

    const { getTradeDisplayInfo } = useRiskManagement(strategy);

    if (!isTradeableSignal(signal)) {
      loggingService.logEvent('TRADE', 'Signal rejected - not tradable', {
        signalType: signal.signalType,
        assetPair: signal.assetPair,
        reason: 'signal_type_not_tradable'
      });
      
      addLogEntry('INFO', `Signal ${signal.signalType} für ${signal.assetPair} ist nicht handelbar`);
      addSignalLog(signal, 'ignored');
      setCurrentSignal(null);
      return;
    }

    addLogEntry('TRADE', `Signal angenommen: ${signal.signalType} ${signal.assetPair}`);
    addSignalLog(signal, 'accepted');
    
    try {
      // Check if we're in real trading mode
      if (settings.tradingMode === 'real') {
        await executeRealTrade(signal, addLogEntry, addTradeLog);
      } else {
        await executeSimulatedTrade(signal, simulationState, saveSimulationState, addLogEntry, addTradeLog, addPortfolioUpdateLog, strategy, getTradeDisplayInfo);
      }
      
      setCurrentSignal(null);

      setTimeout(() => {
        startAISignalGeneration();
      }, 45000);

    } catch (error) {
      console.error('Error executing trade:', error);
      
      loggingService.logError('Trade execution failed', {
        signalType: signal.signalType,
        assetPair: signal.assetPair,
        error: error instanceof Error ? error.message : 'unknown',
        portfolioValue: simulationState.currentPortfolioValue,
        tradingMode: settings.tradingMode
      });
      
      addLogEntry('ERROR', `Fehler bei der Trade-Ausführung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setCurrentSignal(null);
    }
  }, [settings.tradingMode, executeRealTrade, executeSimulatedTrade, isTradeableSignal]);

  const ignoreSignal = useCallback((
    signal: Signal,
    addLogEntry: (type: any, message: string) => void,
    setCurrentSignal: (signal: Signal | null) => void,
    startAISignalGeneration: () => void,
    addSignalLog: (signal: Signal, action: 'generated' | 'accepted' | 'ignored') => void
  ) => {
    loggingService.logEvent('TRADE', 'Signal ignored', {
      signalType: signal.signalType,
      assetPair: signal.assetPair,
      reason: 'user_choice'
    });
    
    addLogEntry('INFO', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    addSignalLog(signal, 'ignored');
    setCurrentSignal(null);
    
    toast({
      title: "Signal ignoriert",
      description: `${signal.signalType} ${signal.assetPair} wurde übersprungen`,
    });

    setTimeout(() => {
      startAISignalGeneration();
    }, 15000);
  }, []);

  return {
    acceptSignal,
    ignoreSignal,
    executeTradeFromSignal
  };
};
