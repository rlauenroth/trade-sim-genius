import { useCallback } from 'react';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';
import { SignalGenerationParams, MarketScreeningResult } from '@/types/aiSignalHooks';
import { useCandidates } from '@/hooks/useCandidates';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useMarketScreening = () => {
  const { addCandidate, updateCandidateStatus } = useCandidates();
  const { settings } = useSettingsV2Store();

  const performScreeningAndAnalysis = useCallback(async (
    params: SignalGenerationParams,
    addLogEntry: (type: any, message: string) => void
  ): Promise<MarketScreeningResult> => {
    const selectedModelId = settings.model.id;
    
    const aiService = new AISignalService({
      kucoinCredentials: {
        kucoinApiKey: params.kucoinKeys.key,
        kucoinApiSecret: params.kucoinKeys.secret,
        kucoinApiPassphrase: params.kucoinKeys.passphrase
      },
      openRouterApiKey: params.openRouterApiKey,
      strategy: params.strategy,
      simulatedPortfolioValue: params.portfolioValue,
      availableUSDT: params.availableUSDT,
      selectedModelId: selectedModelId // Pass the selected model ID
    });

    // Check if API is properly configured
    loggingService.logEvent('AI', 'Validating comprehensive API configuration', {
      hasKucoinKeys: true,
      hasOpenRouterKey: true,
      strategy: params.strategy
    });
    
    const isValidConfig = await aiService.isApiConfigurationValid();
    if (!isValidConfig) {
      loggingService.logError('AI analysis failed - invalid API configuration', {
        reason: 'api_validation_failed'
      });
      addLogEntry('ERROR', 'OpenRouter API-Schlüssel ungültig oder Konfiguration fehlerhaft');
      addLogEntry('INFO', 'Keine Demo-Signale verfügbar - nur echte KI-Analyse');
      return { selectedPairs: [], signals: [] };
    }

    addLogEntry('INFO', `Verwende umfassende KI-Analyse mit ${params.strategy} Strategie`);
    
    // Stage 1: Market screening
    addLogEntry('AI', 'Stage 1: Market-Screening wird gestartet...');
    const selectedPairs = await aiService.performMarketScreening();
    
    // Add all screened pairs as candidates
    selectedPairs.forEach(pair => addCandidate(pair));
    addLogEntry('AI', `${selectedPairs.length} Assets für Detailanalyse ausgewählt`);
    
    // Stage 2: Generate detailed signals
    const signals: any[] = [];
    
    for (let i = 0; i < selectedPairs.length; i++) {
      const pair = selectedPairs[i];
      
      updateCandidateStatus(pair, 'analyzed');
      addLogEntry('AI', `Analysiere ${pair} (${i + 1}/${selectedPairs.length})...`);
      
      try {
        const signal = await aiService.generateDetailedSignal(pair);
        if (signal) {
          signals.push(signal);
          
          updateCandidateStatus(
            pair, 
            'signal', 
            signal.signalType as 'BUY' | 'SELL' | 'HOLD',
            signal.confidenceScore
          );
          
          loggingService.logEvent('AI', 'Signal generated for pair', {
            pair,
            signalType: signal.signalType,
            confidence: signal.confidenceScore
          });
        } else {
          updateCandidateStatus(pair, 'analyzed');
        }
      } catch (error) {
        updateCandidateStatus(pair, 'analyzed');
        loggingService.logError('Signal generation failed for pair', {
          pair,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < selectedPairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { selectedPairs, signals };
  }, [addCandidate, updateCandidateStatus, settings.model.id]);

  return { performScreeningAndAnalysis };
};
