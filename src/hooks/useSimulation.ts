
import { useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { SimulationState } from '@/types/simulation';
import { useSimulationState } from './useSimulationState';
import { useActivityLog } from './useActivityLog';
import { useAISignals } from './useAISignals';
import { useTradeExecution } from './useTradeExecution';

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

  // Load saved state on mount
  useEffect(() => {
    loadSimulationState();
    loadActivityLog();
  }, [loadSimulationState, loadActivityLog]);

  const startSimulation = useCallback(async () => {
    try {
      addLogEntry('INFO', 'Simulation wird gestartet...');
      
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
        description: "Paper-Trading ist jetzt aktiv. KI-Signalgenerierung startet...",
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
