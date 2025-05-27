import { useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { SimulationState } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useActivityLog } from './useActivityLog';
import { useAISignals } from './useAISignals';
import { useTradeExecution } from './useTradeExecution';
import { usePortfolioLive } from './usePortfolioLive';
import { useAppState } from './useAppState';
import { apiModeService } from '@/services/apiModeService';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { useSimGuard } from './useSimGuard';
import { getStrategyConfig, MINIMUM_TRADE_USDT } from '@/config/strategy';
import { useRiskManagement } from './useRiskManagement';

export const useSimulation = () => {
  const {
    simulationState,
    isSimulationActive,
    setIsSimulationActive,
    loadSimulationState,
    saveSimulationState,
    clearSimulationState
  } = useSimulationState();

  const {
    activityLog,
    loadActivityLog,
    addLogEntry,
    addSimulationStartLog,
    addSimulationStopLog,
    addTradeLog,
    addSignalLog,
    addPortfolioUpdateLog
  } = useActivityLog();

  const {
    currentSignal,
    setCurrentSignal,
    startAISignalGeneration
  } = useAISignals();

  const {
    acceptSignal: executeAcceptSignal,
    ignoreSignal: executeIgnoreSignal
  } = useTradeExecution();

  const { isRunningBlocked, state: readinessState, reason } = useSimGuard();
  const { snapshot: livePortfolio } = usePortfolioLive();
  const { userSettings } = useAppState();

  // Auto-pause simulation when readiness becomes unstable
  useEffect(() => {
    if (isSimulationActive && isRunningBlocked && simulationState && !simulationState.isPaused) {
      console.log('🚨 Auto-pausing simulation due to system instability:', reason);
      
      addLogEntry('WARNING', `Simulation automatisch pausiert: ${reason}`);
      
      const updatedState = { ...simulationState, isPaused: true };
      saveSimulationState(updatedState);
      setIsSimulationActive(false);
      
      toast({
        title: "Simulation pausiert",
        description: `System nicht bereit: ${reason}`,
        variant: "destructive"
      });
    }
  }, [isSimulationActive, isRunningBlocked, simulationState, reason, saveSimulationState, setIsSimulationActive, addLogEntry]);

  // Load saved state and migrate old data
  useEffect(() => {
    const currentPortfolioValue = livePortfolio?.totalUSDValue;
    
    // Clean up old demo simulation states
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (saved) {
        const state = JSON.parse(saved);
        // Remove old hardcoded 10000 start values
        if (state.startPortfolioValue === 10000) {
          console.log('🗑️ Removing old demo simulation state with 10000 start value');
          localStorage.removeItem('kiTradingApp_simulationState');
        }
      }
    } catch (error) {
      console.error('Error cleaning old simulation state:', error);
    }

    // Remove demo mode flag
    localStorage.removeItem('demoModeEnabled');
    
    loadSimulationState(currentPortfolioValue);
    loadActivityLog();
    
    simReadinessStore.initialize();
    
    apiModeService.initializeApiModes().then(() => {
      const status = apiModeService.getApiModeStatus();
      if (status.corsIssuesDetected) {
        addLogEntry('INFO', 'CORS-Beschränkungen erkannt. App läuft im Hybrid-Modus mit simulierten privaten Daten.');
      } else {
        addLogEntry('INFO', 'API-Modi initialisiert. Live-Daten verfügbar für öffentliche Endpunkte.');
      }
    });
  }, [loadSimulationState, loadActivityLog, addLogEntry, livePortfolio]);

  const startSimulation = useCallback(async () => {
    try {
      if (!livePortfolio) {
        addLogEntry('ERROR', 'Live-Portfolio-Daten nicht verfügbar. Bitte warten Sie, bis die Daten geladen sind.');
        toast({
          title: "Fehler",
          description: "Portfolio-Daten müssen geladen sein, bevor die Simulation gestartet werden kann.",
          variant: "destructive"
        });
        return;
      }

      // Validate portfolio has meaningful value
      if (livePortfolio.totalUSDValue === 0 || livePortfolio.positions.length === 0) {
        addLogEntry('ERROR', 'Portfolio leer – Simulation nicht möglich');
        toast({
          title: "Portfolio leer",
          description: "Simulation nicht möglich mit leerem Portfolio.",
          variant: "destructive"
        });
        return;
      }

      // Only check if portfolio has at least minimum trade size
      if (livePortfolio.totalUSDValue < MINIMUM_TRADE_USDT) {
        addLogEntry('ERROR', `Portfolio-Wert zu niedrig. Minimum: $${MINIMUM_TRADE_USDT}`);
        toast({
          title: "Portfolio zu klein",
          description: `Mindestens $${MINIMUM_TRADE_USDT} für Trading benötigt`,
          variant: "destructive"
        });
        return;
      }

      addLogEntry('INFO', 'Realistische Simulation wird gestartet...');
      
      clearSimulationState();
      simReadinessStore.startSimulation();
      
      const apiStatus = apiModeService.getApiModeStatus();
      addLogEntry('INFO', `KuCoin API-Modus: ${apiStatus.kucoinMode}`);
      addLogEntry('INFO', `OpenRouter API-Modus: ${apiStatus.openRouterMode}`);
      
      // Use exact live portfolio value as start value
      const actualStartValue = livePortfolio.totalUSDValue;
      
      // Create paper assets matching live portfolio structure
      const paperAssets = livePortfolio.positions.map(pos => ({
        symbol: pos.currency,
        quantity: pos.balance,
        entryPrice: pos.currency === 'USDT' ? 1 : undefined
      }));

      const newState: SimulationState = {
        isActive: true,
        isPaused: false,
        startTime: Date.now(),
        startPortfolioValue: actualStartValue,
        currentPortfolioValue: actualStartValue,
        realizedPnL: 0,
        openPositions: [],
        paperAssets
      };

      saveSimulationState(newState);
      setIsSimulationActive(true);
      
      addSimulationStartLog(actualStartValue);
      addLogEntry('INFO', `Echtes Startkapital: $${actualStartValue.toLocaleString()}`);
      
      const strategy = userSettings.tradingStrategy || 'balanced';
      const config = getStrategyConfig(strategy);
      const { getTradeDisplayInfo } = useRiskManagement(strategy);
      const displayInfo = getTradeDisplayInfo(actualStartValue, strategy);
      
      addLogEntry('INFO', `Strategie: ${strategy} (${displayInfo.percentage}% pro Trade, Min: $${displayInfo.minimum})`);
      
      if (apiStatus.corsIssuesDetected) {
        addLogEntry('INFO', 'Verwende Hybrid-Modus: Live-Marktdaten + simulierte Portfolio-Daten');
      }
      
      setTimeout(() => {
        startAISignalGeneration(
          true,
          newState,
          (type, message) => addLogEntry(type, message)
        );
      }, 3000);

      toast({
        title: "Realistische Simulation gestartet",
        description: `Paper-Trading aktiv mit $${actualStartValue.toLocaleString()} echtem Startkapital (${strategy} Strategie).`,
      });
      
    } catch (error) {
      console.error('Error starting simulation:', error);
      addLogEntry('ERROR', 'Fehler beim Starten der Simulation');
      toast({
        title: "Fehler",
        description: "Simulation konnte nicht gestartet werden.",
        variant: "destructive"
      });
    }
  }, [livePortfolio, userSettings.tradingStrategy, addSimulationStartLog, addLogEntry, saveSimulationState, setIsSimulationActive, startAISignalGeneration, clearSimulationState]);

  const stopSimulation = useCallback(() => {
    if (!simulationState) return;

    simReadinessStore.stopSimulation();

    addLogEntry('INFO', 'Simulation wird beendet...');
    
    let finalValue = simulationState.currentPortfolioValue;
    if (simulationState.openPositions.length > 0) {
      addLogEntry('INFO', 'Schließe alle offenen Positionen...');
      finalValue += simulationState.openPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    }

    const totalPnL = finalValue - simulationState.startPortfolioValue;
    const totalPnLPercent = (totalPnL / simulationState.startPortfolioValue) * 100;

    const updatedState: SimulationState = {
      ...simulationState,
      isActive: false,
      isPaused: false,
      currentPortfolioValue: finalValue,
      realizedPnL: totalPnL,
      openPositions: []
    };

    saveSimulationState(updatedState);
    setIsSimulationActive(false);
    setCurrentSignal(null);
    
    addSimulationStopLog(finalValue, totalPnL, totalPnLPercent);
    
    toast({
      title: "Simulation beendet",
      description: `Endergebnis: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`,
    });
  }, [simulationState, addLogEntry, addSimulationStopLog, saveSimulationState, setIsSimulationActive, setCurrentSignal]);

  const pauseSimulation = useCallback(() => {
    if (!simulationState) return;

    const updatedState = { ...simulationState, isPaused: true };
    saveSimulationState(updatedState);
    setIsSimulationActive(false);
    
    addLogEntry('INFO', 'Simulation pausiert');
    toast({
      title: "Simulation pausiert",
      description: "KI-Signalgenerierung gestoppt",
    });
  }, [simulationState, addLogEntry, saveSimulationState, setIsSimulationActive]);

  const resumeSimulation = useCallback(() => {
    if (!simulationState) return;

    simReadinessStore.startSimulation();

    const updatedState = { ...simulationState, isPaused: false };
    saveSimulationState(updatedState);
    setIsSimulationActive(true);
    
    addLogEntry('INFO', 'Simulation fortgesetzt');
    toast({
      title: "Simulation fortgesetzt",
      description: "KI-Signalgenerierung läuft wieder",
    });
    
    setTimeout(() => {
      startAISignalGeneration(
        true,
        updatedState,
        (type, message) => addLogEntry(type, message)
      );
    }, 3000);
  }, [simulationState, addLogEntry, saveSimulationState, setIsSimulationActive, startAISignalGeneration]);

  const acceptSignal = useCallback((signal: any) => {
    const strategy = userSettings.tradingStrategy || 'balanced';
    executeAcceptSignal(
      signal,
      simulationState,
      (type, message) => addLogEntry(type, message),
      saveSimulationState,
      setCurrentSignal,
      () => startAISignalGeneration(
        isSimulationActive,
        simulationState,
        (type, message) => addLogEntry(type, message)
      ),
      addTradeLog,
      addSignalLog,
      addPortfolioUpdateLog,
      strategy
    );
  }, [executeAcceptSignal, simulationState, addLogEntry, saveSimulationState, setCurrentSignal, startAISignalGeneration, isSimulationActive, addTradeLog, addSignalLog, addPortfolioUpdateLog, userSettings.tradingStrategy]);

  const ignoreSignal = useCallback((signal: any) => {
    executeIgnoreSignal(
      signal,
      (type, message) => addLogEntry(type, message),
      setCurrentSignal,
      () => startAISignalGeneration(
        isSimulationActive,
        simulationState,
        (type, message) => addLogEntry(type, message)
      ),
      addSignalLog
    );
  }, [executeIgnoreSignal, addLogEntry, setCurrentSignal, startAISignalGeneration, isSimulationActive, simulationState, addSignalLog]);

  return {
    simulationState,
    isSimulationActive,
    currentSignal,
    activityLog,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal
  };
};
