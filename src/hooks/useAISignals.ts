
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignal';

export const useAISignals = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);

  const startAISignalGeneration = useCallback(async (
    isActive: boolean, 
    simulationState: any, 
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (!isActive) return;
    
    try {
      addLogEntry('AI', 'Starte echte KI-Marktanalyse...');
      
      // Get API keys from localStorage
      const storedKeys = JSON.parse(localStorage.getItem('kiTradingApp_apiKeys') || '{}');
      
      // Use actual portfolio value instead of hardcoded fallback
      const portfolioValue = simulationState?.currentPortfolioValue || null;
      const availableUSDT = simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity || null;
      
      if (!portfolioValue || !availableUSDT) {
        addLogEntry('ERROR', 'Portfolio-Daten nicht verfügbar für KI-Analyse');
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
      
      // Check if API is properly configured
      const isValidConfig = await aiService.isApiConfigurationValid();
      if (!isValidConfig) {
        addLogEntry('ERROR', 'OpenRouter API-Schlüssel ungültig oder nicht konfiguriert');
        addLogEntry('INFO', 'Keine Demo-Signale verfügbar - nur echte KI-Analyse');
        return;
      }

      addLogEntry('INFO', 'Verwende echte KI-Analyse über OpenRouter API');
      
      const signals = await aiService.generateSignals();
      
      if (signals.length > 0) {
        const signal = signals[0];
        setCurrentSignal(signal);
        
        addLogEntry('AI', `KI-Signal generiert: ${signal.signalType} ${signal.assetPair}`);
        
        if (signal.reasoning) {
          addLogEntry('AI', `KI-Begründung: ${signal.reasoning}`);
        }
      } else {
        addLogEntry('INFO', 'No tradable signals this cycle');
      }
      
    } catch (error) {
      console.error('AI signal generation error:', error);
      addLogEntry('ERROR', `KI-Service Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, []);

  return {
    currentSignal,
    setCurrentSignal,
    startAISignalGeneration
  };
};
