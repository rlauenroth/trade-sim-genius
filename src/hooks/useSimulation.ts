import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { AISignalService } from '@/services/aiSignalService';
import { getCurrentPrice } from '@/utils/kucoinApi';

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
      
      // Start AI signal generation
      setTimeout(() => {
        startAISignalGeneration();
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
  }, [addLogEntry, saveSimulationState]);

  // Start AI signal generation process
  const startAISignalGeneration = useCallback(async () => {
    if (!isSimulationActive) return;
    
    try {
      addLogEntry('AI', 'Starte KI-Marktanalyse...');
      
      // In a real implementation, you would get these from decrypted storage
      const mockCredentials = {
        kucoin: {
          apiKey: 'mock_key',
          apiSecret: 'mock_secret',
          passphrase: 'mock_passphrase'
        },
        openRouter: 'mock_openrouter_key'
      };
      
      // Get current user settings (strategy would come from useAppState)
      const strategy = 'balanced'; // This should come from user settings
      
      const aiService = new AISignalService({
        kucoinCredentials: mockCredentials.kucoin,
        openRouterApiKey: mockCredentials.openRouter,
        strategy: strategy,
        simulatedPortfolioValue: simulationState?.currentPortfolioValue || 10000,
        availableUSDT: simulationState?.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 10000
      });
      
      // Generate signals
      const signals = await aiService.generateSignals();
      
      if (signals.length > 0) {
        const signal = signals[0]; // Take the first signal
        setCurrentSignal(signal);
        addLogEntry('AI', `Neues Signal generiert: ${signal.signalType} ${signal.assetPair}`);
        
        if (signal.reasoning) {
          addLogEntry('AI', `KI-Begründung: ${signal.reasoning}`);
        }
      } else {
        addLogEntry('AI', 'Keine handelswerten Signale gefunden. Versuche in 30 Sekunden erneut...');
        // Schedule next analysis
        setTimeout(() => {
          startAISignalGeneration();
        }, 30000);
      }
      
    } catch (error) {
      console.error('AI signal generation error:', error);
      addLogEntry('ERROR', 'Fehler bei der KI-Signalgenerierung');
      
      // Fallback to mock signal for development
      setTimeout(() => {
        generateMockSignal();
      }, 5000);
    }
  }, [isSimulationActive, simulationState, addLogEntry]);

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

  const acceptSignal = useCallback(async (signal: Signal) => {
    if (!simulationState || !signal) return;

    // Only create positions for tradeable signals
    if (signal.signalType !== 'BUY' && signal.signalType !== 'SELL') {
      addLogEntry('INFO', `Signal ${signal.signalType} für ${signal.assetPair} ist nicht handelbar`);
      setCurrentSignal(null);
      return;
    }

    addLogEntry('TRADE', `Signal angenommen: ${signal.signalType} ${signal.assetPair}`);
    
    try {
      // Get real market price (in development, this would use mock data)
      let currentPrice: number;
      
      try {
        // Try to get real price, fallback to mock if API not available
        currentPrice = typeof signal.entryPriceSuggestion === 'number' 
          ? signal.entryPriceSuggestion 
          : (signal.assetPair.includes('BTC') ? 60000 : 3000); // Mock prices
      } catch (error) {
        console.log('Using mock price due to API limitation');
        currentPrice = signal.assetPair.includes('BTC') ? 60000 : 3000;
      }
      
      // Calculate position size based on strategy
      const idealPositionPercent = signal.suggestedPositionSizePercent || 3.0;
      const idealPositionSize = (simulationState.currentPortfolioValue * idealPositionPercent) / 100;
      const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
      const actualPositionSize = Math.min(idealPositionSize, availableUSDT);
      
      // Check minimum trade size
      const minTradeSize = 50; // Minimum $50 trade
      if (actualPositionSize < minTradeSize) {
        addLogEntry('WARNING', `Nicht genügend USDT für Trade. Benötigt: $${minTradeSize}, Verfügbar: $${availableUSDT.toFixed(2)}`);
        setCurrentSignal(null);
        return;
      }
      
      const quantity = actualPositionSize / currentPrice;
      const tradingFee = actualPositionSize * 0.001; // 0.1% fee
      
      const newPosition: Position = {
        id: `pos_${Date.now()}`,
        assetPair: signal.assetPair,
        type: signal.signalType,
        entryPrice: currentPrice,
        quantity,
        takeProfit: signal.takeProfitPrice,
        stopLoss: signal.stopLossPrice,
        unrealizedPnL: 0,
        openTimestamp: Date.now()
      };

      // Update paper portfolio
      const updatedAssets = simulationState.paperAssets.map(asset => {
        if (asset.symbol === 'USDT') {
          return { ...asset, quantity: asset.quantity - actualPositionSize - tradingFee };
        }
        return asset;
      });
      
      // Add new asset or update existing
      const assetSymbol = signal.assetPair.split('/')[0] || signal.assetPair.split('-')[0];
      const existingAssetIndex = updatedAssets.findIndex(asset => asset.symbol === assetSymbol);
      
      if (existingAssetIndex >= 0) {
        updatedAssets[existingAssetIndex].quantity += quantity;
      } else {
        updatedAssets.push({
          symbol: assetSymbol,
          quantity: quantity,
          entryPrice: currentPrice
        });
      }

      const updatedState = {
        ...simulationState,
        openPositions: [...simulationState.openPositions, newPosition],
        paperAssets: updatedAssets,
        currentPortfolioValue: simulationState.currentPortfolioValue - tradingFee
      };

      saveSimulationState(updatedState);
      setCurrentSignal(null);
      
      addLogEntry('SUCCESS', `Position eröffnet: ${quantity.toFixed(6)} ${assetSymbol} @ $${currentPrice.toFixed(2)}`);
      addLogEntry('INFO', `Handelsgröße: $${actualPositionSize.toFixed(2)}, Gebühr: $${tradingFee.toFixed(2)}`);
      
      toast({
        title: "Position eröffnet",
        description: `${signal.signalType} ${signal.assetPair} für $${actualPositionSize.toFixed(2)}`,
      });

      // Schedule next signal generation
      setTimeout(() => {
        startAISignalGeneration();
      }, 45000); // 45 seconds

    } catch (error) {
      console.error('Error executing trade:', error);
      addLogEntry('ERROR', 'Fehler bei der Trade-Ausführung');
      setCurrentSignal(null);
    }
  }, [simulationState, addLogEntry, saveSimulationState, startAISignalGeneration]);

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
