
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignal';

export const useAISignals = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const generateMockSignal = useCallback((isActive: boolean, addLogEntry: (type: any, message: string) => void) => {
    if (!isActive) return;

    addLogEntry('AI', 'Generiere Demo-Signal...');
    
    setTimeout(() => {
      const mockSignals: Signal[] = [
        {
          assetPair: 'BTC/USDT',
          signalType: 'BUY',
          entryPriceSuggestion: 'MARKET',
          takeProfitPrice: 62000,
          stopLossPrice: 59500,
          confidenceScore: 0.75,
          reasoning: 'Demo-Signal: RSI zeigt überverkauft, MACD bullisches Momentum, Preis prallt von Support ab',
          suggestedPositionSizePercent: 5
        },
        {
          assetPair: 'ETH/USDT',
          signalType: 'BUY',
          entryPriceSuggestion: 'MARKET',
          takeProfitPrice: 3200,
          stopLossPrice: 2950,
          confidenceScore: 0.68,
          reasoning: 'Demo-Signal: Durchbruch über Widerstand bei 3050, hohe Volumen-Bestätigung',
          suggestedPositionSizePercent: 3
        },
        {
          assetPair: 'SOL/USDT',
          signalType: 'BUY',
          entryPriceSuggestion: 'MARKET',
          takeProfitPrice: 160,
          stopLossPrice: 145,
          confidenceScore: 0.72,
          reasoning: 'Demo-Signal: Starke Aufwärtsbewegung, hohe Aktivität im Solana-Ökosystem',
          suggestedPositionSizePercent: 4
        }
      ];

      const signal = mockSignals[Math.floor(Math.random() * mockSignals.length)];
      setCurrentSignal(signal);
      setIsDemoMode(true);
      
      addLogEntry('AI', `Demo-Signal für ${signal.assetPair}: ${signal.signalType} (Konfidenz: ${Math.round((signal.confidenceScore || 0) * 100)}%)`);
      addLogEntry('INFO', 'Läuft im Demo-Modus - keine echten KI-Analysen');
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
      
      // Get API keys from localStorage
      const storedKeys = JSON.parse(localStorage.getItem('kiTradingApp_apiKeys') || '{}');
      
      // Use actual portfolio value instead of hardcoded fallback
      const portfolioValue = simulationState?.currentPortfolioValue || null;
      const availableUSDT = simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity || null;
      
      if (!portfolioValue || !availableUSDT) {
        addLogEntry('ERROR', 'Portfolio-Daten nicht verfügbar für KI-Analyse');
        setTimeout(() => generateMockSignalFallback(), 3000);
        return;
      }
      
      const aiService = new AISignalService({
        kucoinCredentials: {
          kucoinApiKey: storedKeys.kucoinApiKey || '',
          kucoinApiSecret: storedKeys.kucoinApiSecret || '',
          kucoinApiPassphrase: storedKeys.kucoinApiPassphrase || ''
        },
        openRouterApiKey: storedKeys.openRouterApiKey || '',
        strategy: 'balanced',
        simulatedPortfolioValue: portfolioValue,
        availableUSDT: availableUSDT
      });
      
      // Check if we'll be using demo mode
      const willUseDemoMode = await aiService.shouldUseDemoMode();
      setIsDemoMode(willUseDemoMode);
      
      if (willUseDemoMode) {
        addLogEntry('INFO', 'OpenRouter API-Schlüssel ungültig oder nicht vorhanden');
        addLogEntry('INFO', 'Läuft im Demo-Modus mit simulierten KI-Signalen');
      } else {
        addLogEntry('INFO', 'Verwende echte KI-Analyse über OpenRouter API');
      }
      
      const signals = await aiService.generateSignals();
      
      if (signals.length > 0) {
        const signal = signals[0];
        setCurrentSignal(signal);
        
        const modeText = signal.isDemoMode ? 'Demo-Signal' : 'KI-Signal';
        addLogEntry('AI', `${modeText} generiert: ${signal.signalType} ${signal.assetPair}`);
        
        if (signal.reasoning) {
          const reasoningPrefix = signal.isDemoMode ? 'Demo-Begründung' : 'KI-Begründung';
          addLogEntry('AI', `${reasoningPrefix}: ${signal.reasoning}`);
        }
      } else {
        addLogEntry('AI', 'Keine handelswerten Signale gefunden. Verwende Fallback...');
        setTimeout(() => generateMockSignalFallback(), 5000);
      }
      
    } catch (error) {
      console.error('AI signal generation error:', error);
      addLogEntry('INFO', 'KI-Service Fehler, verwende Demo-Signale...');
      setIsDemoMode(true);
      
      // Fallback to mock signals
      setTimeout(() => {
        generateMockSignalFallback();
      }, 3000);
    }
  }, []);

  return {
    currentSignal,
    setCurrentSignal,
    generateMockSignal,
    startAISignalGeneration,
    isDemoMode
  };
};
