
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';

export const useAISignals = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);

  const startAISignalGeneration = useCallback(async (
    isActive: boolean, 
    simulationState: any, 
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (!isActive) {
      loggingService.logEvent('AI', 'Signal generation skipped - simulation inactive', {
        isActive
      });
      return;
    }
    
    try {
      loggingService.logEvent('AI', 'Starting AI market analysis', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0
      });
      
      addLogEntry('AI', 'Starte echte KI-Marktanalyse...');
      
      // Get API keys from localStorage
      const storedKeys = JSON.parse(localStorage.getItem('kiTradingApp_apiKeys') || '{}');
      
      // Use actual portfolio value instead of hardcoded fallback
      const portfolioValue = simulationState?.currentPortfolioValue || null;
      const availableUSDT = simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity || null;
      
      if (!portfolioValue || !availableUSDT) {
        loggingService.logError('AI analysis failed - missing portfolio data', {
          hasPortfolioValue: !!portfolioValue,
          hasAvailableUSDT: !!availableUSDT,
          portfolioValue,
          availableUSDT
        });
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
      loggingService.logEvent('AI', 'Validating API configuration', {
        hasKucoinKeys: !!(storedKeys.kucoinApiKey && storedKeys.kucoinApiSecret && storedKeys.kucoinApiPassphrase),
        hasOpenRouterKey: !!storedKeys.openRouterApiKey
      });
      
      const isValidConfig = await aiService.isApiConfigurationValid();
      if (!isValidConfig) {
        loggingService.logError('AI analysis failed - invalid API configuration', {
          hasKucoinKeys: !!(storedKeys.kucoinApiKey && storedKeys.kucoinApiSecret && storedKeys.kucoinApiPassphrase),
          hasOpenRouterKey: !!storedKeys.openRouterApiKey
        });
        addLogEntry('ERROR', 'OpenRouter API-Schlüssel ungültig oder nicht konfiguriert');
        addLogEntry('INFO', 'Keine Demo-Signale verfügbar - nur echte KI-Analyse');
        return;
      }

      addLogEntry('INFO', 'Verwende echte KI-Analyse über OpenRouter API');
      
      loggingService.logEvent('AI', 'Starting signal generation', {
        strategy: 'balanced',
        portfolioValue,
        availableUSDT
      });
      
      const signals = await aiService.generateSignals();
      
      loggingService.logEvent('AI', 'Signal generation completed', {
        signalsGenerated: signals.length,
        signalTypes: signals.map(s => s.signalType),
        assetPairs: signals.map(s => s.assetPair)
      });
      
      if (signals.length > 0) {
        const signal = signals[0];
        setCurrentSignal(signal);
        
        loggingService.logEvent('AI', 'Signal selected and set', {
          signalType: signal.signalType,
          assetPair: signal.assetPair,
          confidenceScore: signal.confidenceScore,
          entryPrice: signal.entryPriceSuggestion,
          hasReasoning: !!signal.reasoning
        });
        
        addLogEntry('AI', `KI-Signal generiert: ${signal.signalType} ${signal.assetPair}`);
        
        if (signal.reasoning) {
          addLogEntry('AI', `KI-Begründung: ${signal.reasoning}`);
        }
      } else {
        loggingService.logEvent('AI', 'No tradable signals generated', {
          reason: 'no_signals_this_cycle'
        });
        addLogEntry('INFO', 'No tradable signals this cycle');
      }
      
    } catch (error) {
      console.error('AI signal generation error:', error);
      
      loggingService.logError('AI signal generation error', {
        error: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity
      });
      
      addLogEntry('ERROR', `KI-Service Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, []);

  return {
    currentSignal,
    setCurrentSignal,
    startAISignalGeneration
  };
};
