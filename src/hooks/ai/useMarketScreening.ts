
import { useCallback } from 'react';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';
import { SignalGenerationParams, MarketScreeningResult } from '@/types/aiSignalHooks';
import { useCandidates } from '@/hooks/useCandidates';
import { useSettingsV2Store } from '@/stores/settingsV2';

export const useMarketScreening = () => {
  const { addCandidate, updateCandidateStatus, advanceCandidateToNextStage } = useCandidates();
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
      selectedModelId: selectedModelId
    });

    // Check API configuration
    const isValidConfig = await aiService.isApiConfigurationValid();
    if (!isValidConfig) {
      addLogEntry('ERROR', 'OpenRouter API-Schlüssel ungültig');
      return { selectedPairs: [], signals: [] };
    }

    addLogEntry('INFO', `KI-Analyse mit ${params.strategy} Strategie gestartet`);
    
    // Stage 1: Market screening with real-time candidate updates
    addLogEntry('AI', 'Market-Screening läuft...');
    const selectedPairs = await aiService.performMarketScreening();
    
    // Add candidates immediately with screening status
    selectedPairs.forEach(pair => {
      addCandidate(pair, 'screening_stage1_pending');
      addLogEntry('AI', `Asset hinzugefügt: ${pair}`);
    });
    
    addLogEntry('AI', `${selectedPairs.length} Assets für Analyse ausgewählt`);
    
    // Stage 2: Generate detailed signals with live candidate updates
    const signals: any[] = [];
    
    for (let i = 0; i < selectedPairs.length; i++) {
      const pair = selectedPairs[i];
      
      // Update candidate status to detail analysis pending (data loading phase)
      advanceCandidateToNextStage(pair, 'detail_analysis_pending');
      addLogEntry('AI', `Lade Daten für ${pair} (${i + 1}/${selectedPairs.length})...`);
      
      try {
        // Update to analysis running
        advanceCandidateToNextStage(pair, 'detail_analysis_running');
        addLogEntry('AI', `Analysiere ${pair} mit KI...`);
        
        const signal = await aiService.generateDetailedSignal(pair);
        if (signal) {
          signals.push(signal);
          
          // Update candidate with signal information
          updateCandidateStatus(
            pair, 
            'signal_generated', 
            signal.signalType as 'BUY' | 'SELL' | 'HOLD',
            signal.confidenceScore
          );
          
          addLogEntry('AI', `Signal generiert: ${signal.signalType} ${pair} (${Math.round((signal.confidenceScore || 0) * 100)}%)`);
          
          loggingService.logEvent('AI', 'Signal generated for pair', {
            pair,
            signalType: signal.signalType,
            confidence: signal.confidenceScore
          });
        } else {
          // Keep as analyzed if no signal generated
          updateCandidateStatus(pair, 'analyzed');
          addLogEntry('AI', `Kein Signal für ${pair}`);
        }
      } catch (error) {
        updateCandidateStatus(pair, 'error_analysis', undefined, undefined, {
          errorReason: error instanceof Error ? error.message : 'Unknown error'
        });
        addLogEntry('WARNING', `Analyse fehlgeschlagen für ${pair}`);
        loggingService.logError('Signal generation failed for pair', {
          pair,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
      
      // Rate limiting delay
      if (i < selectedPairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    addLogEntry('SUCCESS', `Analyse abgeschlossen: ${signals.length} Signale generiert`);

    return { selectedPairs, signals };
  }, [addCandidate, updateCandidateStatus, advanceCandidateToNextStage, settings.model.id]);

  return { performScreeningAndAnalysis };
};
