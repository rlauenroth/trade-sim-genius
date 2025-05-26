
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignalService';

export const useAISignals = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);

  const generateMockSignal = useCallback((isActive: boolean, addLogEntry: (type: any, message: string) => void) => {
    if (!isActive) return;

    addLogEntry('AI', 'Generiere neues KI-Signal...');
    
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
  }, []);

  const startAISignalGeneration = useCallback(async (
    isActive: boolean, 
    simulationState: any, 
    addLogEntry: (type: any, message: string) => void,
    generateMockSignalFallback: () => void
  ) => {
    if (!isActive) return;
    
    try {
      addLogEntry('AI', 'Starte KI-Marktanalyse...');
      
      const mockCredentials = {
        kucoin: {
          apiKey: 'mock_key',
          apiSecret: 'mock_secret',
          passphrase: 'mock_passphrase'
        },
        openRouter: 'mock_openrouter_key'
      };
      
      const strategy = 'balanced';
      
      const aiService = new AISignalService({
        kucoinCredentials: mockCredentials.kucoin,
        openRouterApiKey: mockCredentials.openRouter,
        strategy: strategy,
        simulatedPortfolioValue: simulationState?.currentPortfolioValue || 10000,
        availableUSDT: simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity || 10000
      });
      
      const signals = await aiService.generateSignals();
      
      if (signals.length > 0) {
        const signal = signals[0];
        setCurrentSignal(signal);
        addLogEntry('AI', `Neues Signal generiert: ${signal.signalType} ${signal.assetPair}`);
        
        if (signal.reasoning) {
          addLogEntry('AI', `KI-Begründung: ${signal.reasoning}`);
        }
      } else {
        addLogEntry('AI', 'Keine handelswerten Signale gefunden. Versuche in 30 Sekunden erneut...');
        setTimeout(() => {
          startAISignalGeneration(isActive, simulationState, addLogEntry, generateMockSignalFallback);
        }, 30000);
      }
      
    } catch (error) {
      console.error('AI signal generation error:', error);
      addLogEntry('ERROR', 'Fehler bei der KI-Signalgenerierung');
      
      setTimeout(() => {
        generateMockSignalFallback();
      }, 5000);
    }
  }, []);

  return {
    currentSignal,
    setCurrentSignal,
    generateMockSignal,
    startAISignalGeneration
  };
};
