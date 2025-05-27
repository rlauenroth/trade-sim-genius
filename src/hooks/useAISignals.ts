
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { Candidate } from '@/types/candidate';
import { AISignalService } from '@/services/aiSignal';
import { loggingService } from '@/services/loggingService';
import { useCandidates } from '@/hooks/useCandidates';

export const useAISignals = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [availableSignals, setAvailableSignals] = useState<Signal[]>([]);
  
  const {
    candidates,
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates
  } = useCandidates();

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
    
    // Clear previous candidates when starting new cycle
    clearCandidates();
    
    try {
      loggingService.logEvent('AI', 'Starting comprehensive AI market analysis', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0
      });
      
      addLogEntry('AI', 'Starte umfassende KI-Marktanalyse...');
      
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
      loggingService.logEvent('AI', 'Validating comprehensive API configuration', {
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

      addLogEntry('INFO', 'Verwende umfassende KI-Analyse mit Multi-Asset-Screening');
      
      loggingService.logEvent('AI', 'Starting multi-signal generation', {
        strategy: 'balanced',
        portfolioValue,
        availableUSDT
      });

      // Stage 1: Market screening - add candidates with screening status
      addLogEntry('AI', 'Stage 1: Market-Screening wird gestartet...');
      const selectedPairs = await aiService.performMarketScreening();
      
      // Add all screened pairs as candidates
      selectedPairs.forEach(pair => addCandidate(pair));
      addLogEntry('AI', `${selectedPairs.length} Assets für Detailanalyse ausgewählt`);
      
      // Stage 2: Generate detailed signals for all selected pairs
      const signals: any[] = [];
      
      for (let i = 0; i < selectedPairs.length; i++) {
        const pair = selectedPairs[i];
        
        // Update candidate status to analyzed
        updateCandidateStatus(pair, 'analyzed');
        addLogEntry('AI', `Analysiere ${pair} (${i + 1}/${selectedPairs.length})...`);
        
        try {
          const signal = await aiService.generateDetailedSignal(pair);
          if (signal) {
            signals.push(signal);
            
            // Update candidate with signal
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
            // Mark as analyzed but no signal
            updateCandidateStatus(pair, 'analyzed');
          }
        } catch (error) {
          // Mark as analyzed but with error
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
      
      loggingService.logEvent('AI', 'Multi-signal generation completed', {
        signalsGenerated: signals.length,
        signalTypes: signals.map(s => s.signalType),
        assetPairs: signals.map(s => s.assetPair),
        avgConfidence: signals.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / signals.length
      });
      
      if (signals.length > 0) {
        // Set all available signals
        setAvailableSignals(signals);
        
        // Set the first (highest confidence) signal as current
        const primarySignal = signals[0];
        setCurrentSignal(primarySignal);
        
        loggingService.logEvent('AI', 'Primary signal selected', {
          signalType: primarySignal.signalType,
          assetPair: primarySignal.assetPair,
          confidenceScore: primarySignal.confidenceScore,
          totalSignalsAvailable: signals.length
        });
        
        addLogEntry('AI', `KI-Signale generiert: ${signals.length} Assets analysiert`);
        addLogEntry('AI', `Primär-Signal: ${primarySignal.signalType} ${primarySignal.assetPair}`);
        
        if (signals.length > 1) {
          const otherSignals = signals.slice(1).map(s => `${s.signalType} ${s.assetPair}`).join(', ');
          addLogEntry('AI', `Weitere Signale verfügbar: ${otherSignals}`);
        }
        
        if (primarySignal.reasoning) {
          addLogEntry('AI', `KI-Begründung: ${primarySignal.reasoning}`);
        }
      } else {
        loggingService.logEvent('AI', 'No tradable signals generated', {
          reason: 'no_signals_this_cycle'
        });
        addLogEntry('INFO', 'No tradable signals this cycle');
        setAvailableSignals([]);
        setCurrentSignal(null);
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
      setAvailableSignals([]);
      setCurrentSignal(null);
    }
  }, [clearCandidates, addCandidate, updateCandidateStatus]);

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    startAISignalGeneration,
    candidates
  };
};
