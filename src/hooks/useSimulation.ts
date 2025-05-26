
import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface SimulationState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  startPortfolioValue: number;
  currentPortfolioValue: number;
  realizedPnL: number;
  openPositions: Position[];
  paperAssets: PaperAsset[];
}

interface Position {
  id: string;
  assetPair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  unrealizedPnL: number;
  openTimestamp: number;
}

interface PaperAsset {
  symbol: string;
  quantity: number;
  entryPrice?: number;
}

interface Signal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
}

interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING';
  message: string;
}

export const useSimulation = () => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    loadSimulationState();
    loadActivityLog();
  }, []);

  const loadSimulationState = useCallback(() => {
    try {
      const saved = localStorage.getItem('kiTradingApp_simulationState');
      if (saved) {
        const state = JSON.parse(saved);
        setSimulationState(state);
        setIsSimulationActive(state.isActive && !state.isPaused);
      }
    } catch (error) {
      console.error('Error loading simulation state:', error);
    }
  }, []);

  const saveSimulationState = useCallback((state: SimulationState) => {
    try {
      localStorage.setItem('kiTradingApp_simulationState', JSON.stringify(state));
      setSimulationState(state);
    } catch (error) {
      console.error('Error saving simulation state:', error);
    }
  }, []);

  const loadActivityLog = useCallback(() => {
    try {
      const saved = localStorage.getItem('kiTradingApp_activityLog');
      if (saved) {
        const log = JSON.parse(saved);
        setActivityLog(log);
      }
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  }, []);

  const addLogEntry = useCallback((type: ActivityLogEntry['type'], message: string) => {
    const entry: ActivityLogEntry = {
      timestamp: Date.now(),
      type,
      message
    };

    setActivityLog(prev => {
      const updated = [...prev, entry].slice(-200); // Keep last 200 entries
      localStorage.setItem('kiTradingApp_activityLog', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const startSimulation = useCallback(async () => {
    try {
      addLogEntry('INFO', 'Simulation wird gestartet...');
      
      // Mock initial portfolio data (in real app, this would come from KuCoin API)
      const mockPortfolioValue = 10000; // $10,000 USDT equivalent
      
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
      
      // Start AI signal generation (mock for now)
      setTimeout(() => {
        generateMockSignal();
      }, 5000);

      toast({
        title: "Simulation gestartet",
        description: "Paper-Trading ist jetzt aktiv. Warten auf KI-Signale...",
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
  }, [addLogEntry, saveSimulationState]);

  const stopSimulation = useCallback(() => {
    if (!simulationState) return;

    addLogEntry('INFO', 'Simulation wird beendet...');
    
    // Close all open positions at current market price (mock)
    let finalValue = simulationState.currentPortfolioValue;
    if (simulationState.openPositions.length > 0) {
      addLogEntry('INFO', 'Schließe alle offenen Positionen...');
      // In real app, would close positions at market price
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
  }, [simulationState, addLogEntry, saveSimulationState]);

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
  }, [simulationState, addLogEntry, saveSimulationState]);

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
    
    // Generate new signal after resuming
    setTimeout(() => {
      generateMockSignal();
    }, 3000);
  }, [simulationState, addLogEntry, saveSimulationState]);

  const generateMockSignal = useCallback(() => {
    if (!isSimulationActive) return;

    addLogEntry('AI', 'Generiere neues KI-Signal...');
    
    // Mock signal generation
    setTimeout(() => {
      const mockSignals: Signal[] = [
        {
          assetPair: 'BTC/USDT',
          signalType: 'BUY',
          entryPriceSuggestion: 'MARKET',
          takeProfitPrice: 62000,
          stopLossPrice: 59500,
          confidenceScore: 0.75,
          reasoning: 'RSI zeigt überverkauft, MACD bullisches Momentum, Preis prallt von Support ab',
          suggestedPositionSizePercent: 5
        },
        {
          assetPair: 'ETH/USDT',
          signalType: 'BUY',
          entryPriceSuggestion: 'MARKET',
          takeProfitPrice: 3200,
          stopLossPrice: 2950,
          confidenceScore: 0.68,
          reasoning: 'Durchbruch über Widerstand bei 3050, hohe Volumen-Bestätigung',
          suggestedPositionSizePercent: 3
        }
      ];

      const signal = mockSignals[Math.floor(Math.random() * mockSignals.length)];
      setCurrentSignal(signal);
      
      addLogEntry('AI', `Neues Signal für ${signal.assetPair}: ${signal.signalType} (Konfidenz: ${Math.round((signal.confidenceScore || 0) * 100)}%)`);
    }, 2000);
  }, [isSimulationActive, addLogEntry]);

  const acceptSignal = useCallback((signal: Signal) => {
    if (!simulationState || !signal) return;

    // Only create positions for tradeable signals
    if (signal.signalType !== 'BUY' && signal.signalType !== 'SELL') {
      addLogEntry('INFO', `Signal ${signal.signalType} für ${signal.assetPair} ist nicht handelbar`);
      setCurrentSignal(null);
      return;
    }

    addLogEntry('TRADE', `Signal angenommen: ${signal.signalType} ${signal.assetPair}`);
    
    // Mock trade execution
    const mockCurrentPrice = signal.signalType === 'BUY' ? 60000 : 3000; // Mock prices
    const positionSize = 500; // Mock $500 position
    const quantity = positionSize / mockCurrentPrice;

    const newPosition: Position = {
      id: `pos_${Date.now()}`,
      assetPair: signal.assetPair,
      type: signal.signalType, // Now this is guaranteed to be 'BUY' | 'SELL'
      entryPrice: mockCurrentPrice,
      quantity,
      takeProfit: signal.takeProfitPrice,
      stopLoss: signal.stopLossPrice,
      unrealizedPnL: 0,
      openTimestamp: Date.now()
    };

    const updatedState = {
      ...simulationState,
      openPositions: [...simulationState.openPositions, newPosition],
      currentPortfolioValue: simulationState.currentPortfolioValue // Will be updated with market movements
    };

    saveSimulationState(updatedState);
    setCurrentSignal(null);
    
    addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${signal.assetPair} @ $${mockCurrentPrice}`);
    
    toast({
      title: "Position eröffnet",
      description: `${signal.signalType} ${signal.assetPair} für $${positionSize}`,
    });

    // Generate next signal
    setTimeout(() => {
      generateMockSignal();
    }, 30000); // 30 seconds
  }, [simulationState, addLogEntry, saveSimulationState, generateMockSignal]);

  const ignoreSignal = useCallback((signal: Signal) => {
    addLogEntry('INFO', `Signal ignoriert: ${signal.signalType} ${signal.assetPair}`);
    setCurrentSignal(null);
    
    toast({
      title: "Signal ignoriert",
      description: `${signal.signalType} ${signal.assetPair} wurde übersprungen`,
    });

    // Generate next signal
    setTimeout(() => {
      generateMockSignal();
    }, 15000); // 15 seconds
  }, [addLogEntry, generateMockSignal]);

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
