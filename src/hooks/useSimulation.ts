
import { useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { SimulationState } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useActivityLog } from './useActivityLog';
import { useAISignals } from './useAISignals';
import { useTradeExecution } from './useTradeExecution';
import { apiModeService } from '@/services/apiModeService';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { useSimGuard } from './useSimGuard';

export const useSimulation = () => {
  const {
    simulationState,
    isSimulationActive,
    setIsSimulationActive,
    loadSimulationState,
    saveSimulationState
  } = useSimulationState();

  const {
    activityLog,
    loadActivityLog,
    addLogEntry
  } = useActivityLog();

  const {
    currentSignal,
    setCurrentSignal,
    generateMockSignal,
    startAISignalGeneration
  } = useAISignals();

  const {
    acceptSignal: executeAcceptSignal,
    ignoreSignal: executeIgnoreSignal
  } = useTradeExecution();

  const { isRunningBlocked, state: readinessState, reason } = useSimGuard();

  // Auto-pause simulation when readiness becomes unstable
  useEffect(() => {
    if (isSimulationActive && isRunningBlocked && simulationState && !simulationState.isPaused) {
      console.log('🚨 Auto-pausing simulation due to system instability:', reason);
      
      addLogEntry('WARNING', `Simulation automatisch pausiert: ${reason}`);
      
      // Update simulation state to paused
      const updatedState = { ...simulationState, isPaused: true };
      saveSimulationState(updatedState);
      setIsSimulationActive(false);
      
      // Show toast notification
      toast({
        title: "Simulation pausiert",
        description: `System nicht bereit: ${reason}`,
        variant: "destructive"
      });
    }
  }, [isSimulationActive, isRunningBlocked, simulationState, reason, saveSimulationState, setIsSimulationActive, addLogEntry]);

  // Load saved state and initialize services on mount
  useEffect(() => {
    loadSimulationState();
    loadActivityLog();
    
    // Initialize sim readiness store
    simReadinessStore.initialize();
    
    // Initialize API modes detection
    apiModeService.initializeApiModes().then(() => {
      const status = apiModeService.getApiModeStatus();
      if (status.corsIssuesDetected) {
        addLogEntry('INFO', 'CORS-Beschränkungen erkannt. App läuft im Hybrid-Modus mit simulierten privaten Daten.');
      } else {
        addLogEntry('INFO', 'API-Modi initialisiert. Live-Daten verfügbar für öffentliche Endpunkte.');
      }
    });
  }, [loadSimulationState, loadActivityLog, addLogEntry]);

  const startSimulation = useCallback(async () => {
    try {
      addLogEntry('INFO', 'Simulation wird gestartet...');
      
      // Notify sim readiness store
      simReadinessStore.startSimulation();
      
      // Check API status before starting
      const apiStatus = apiModeService.getApiModeStatus();
      addLogEntry('INFO', `KuCoin API-Modus: ${apiStatus.kucoinMode}`);
      addLogEntry('INFO', `OpenRouter API-Modus: ${apiStatus.openRouterMode}`);
      
      const mockPortfolioValue = 10000;
      
      const newState: SimulationState = {
        isActive: true,
        isPaused: false,
        startTime: Date.now(),
        startPortfolioValue: mockPortfolioValue,
        currentPortfolioValue: mockPortfolioValue,
        realizedPnL: 0,
        openPositions: [],
        paperAssets: [
          { symbol: 'USDT', quantity: mockPortfolioValue }
        ]
      };

      saveSimulationState(newState);
      setIsSimulationActive(true);
      
      addLogEntry('SUCCESS', 'Simulation erfolgreich gestartet');
      addLogEntry('INFO', `Startkapital: $${mockPortfolioValue.toLocaleString()}`);
      
      if (apiStatus.corsIssuesDetected) {
        addLogEntry('INFO', 'Verwende Hybrid-Modus: Live-Marktdaten + simulierte Portfolio-Daten');
      }
      
      setTimeout(() => {
        startAISignalGeneration(
          true,
          newState,
          addLogEntry,
          () => generateMockSignal(true, addLogEntry)
        );
      }, 3000);

      toast({
        title: "Simulation gestartet",
        description: `Paper-Trading aktiv im ${apiStatus.kucoinMode}-Modus. KI-Signalgenerierung startet...`,
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
  }, [addLogEntry, saveSimulationState, setIsSimulationActive, startAISignalGeneration, generateMockSignal]);

  const stopSimulation = useCallback(() => {
    if (!simulationState) return;

    // Notify sim readiness store
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
    
    addLogEntry('SUCCESS', `Simulation beendet. Endergebnis: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`);
    
    toast({
      title: "Simulation beendet",
      description: `Endergebnis: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`,
    });
  }, [simulationState, addLogEntry, saveSimulationState, setIsSimulationActive, setCurrentSignal]);

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

    // Notify sim readiness store that simulation is running again
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
      generateMockSignal(true, addLogEntry);
    }, 3000);
  }, [simulationState, addLogEntry, saveSimulationState, setIsSimulationActive, generateMockSignal]);

  const acceptSignal = useCallback((signal: any) => {
    executeAcceptSignal(
      signal,
      simulationState,
      addLogEntry,
      saveSimulationState,
      setCurrentSignal,
      () => startAISignalGeneration(
        isSimulationActive,
        simulationState,
        addLogEntry,
        () => generateMockSignal(isSimulationActive, addLogEntry)
      )
    );
  }, [executeAcceptSignal, simulationState, addLogEntry, saveSimulationState, setCurrentSignal, startAISignalGeneration, isSimulationActive, generateMockSignal]);

  const ignoreSignal = useCallback((signal: any) => {
    executeIgnoreSignal(
      signal,
      addLogEntry,
      setCurrentSignal,
      () => generateMockSignal(isSimulationActive, addLogEntry)
    );
  }, [executeIgnoreSignal, addLogEntry, setCurrentSignal, generateMockSignal, isSimulationActive]);

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
