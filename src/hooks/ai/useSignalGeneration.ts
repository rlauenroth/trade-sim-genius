import { useState, useCallback, useRef } from 'react';
import { Signal } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';
import { useAIValidation } from './useAIValidation';
import { usePortfolioDataExtraction } from './usePortfolioDataExtraction';
import { EnhancedAISignalService } from '@/services/aiSignal/enhancedAISignalService';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { CandidateStatus } from '@/types/candidate';

interface CandidateCallbacks {
  addCandidate: (symbol: string, initialStatus?: CandidateStatus) => void;
  updateCandidateStatus: (symbol: string, status: CandidateStatus, signalType?: 'BUY' | 'SELL' | 'HOLD', confidence?: number, additionalData?: any) => void;
  clearCandidates: () => void;
  advanceCandidateToNextStage: (symbol: string, nextStatus: CandidateStatus, meta?: any) => void;
}

export const useSignalGeneration = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [availableSignals, setAvailableSignals] = useState<Signal[]>([]);
  const [isFetchingSignals, setIsFetchingSignals] = useState(false);
  const lastGenerationTime = useRef<number>(0);
  
  const { validateAPIKeys } = useAIValidation();
  const { extractPortfolioData } = usePortfolioDataExtraction();
  const { settings } = useSettingsV2Store();

  const generateSignals = useCallback(async (
    isActive: boolean, 
    simulationState: any, 
    addLogEntry: (type: any, message: string) => void,
    executeAutoTrade?: (signal: Signal, simulationState: any, updateSimulationState: any, addLogEntry: any) => Promise<boolean>,
    updateSimulationState?: (state: any) => void,
    livePortfolioData?: any,
    candidateCallbacks?: CandidateCallbacks
  ) => {
    // Guard against multiple concurrent executions
    if (isFetchingSignals) {
      console.log('🔄 Signal generation skipped - already in progress');
      return;
    }

    // Debounce rapid calls
    const now = Date.now();
    const timeSinceLastGeneration = now - lastGenerationTime.current;
    if (timeSinceLastGeneration < 10000) {
      console.log('🔄 Signal generation debounced - too frequent calls');
      return;
    }

    if (!isActive) {
      console.log('🔄 Signal generation skipped - simulation inactive');
      return;
    }

    setIsFetchingSignals(true);
    lastGenerationTime.current = now;
    
    try {
      // Clear candidates at start of new cycle using callback
      if (candidateCallbacks) {
        candidateCallbacks.clearCandidates();
      }
      
      console.log('🚀 Starting comprehensive AI market analysis with callback-based candidate tracking:', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets?.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0,
        hasAutoExecution: !!executeAutoTrade,
        hasLivePortfolioFallback: !!livePortfolioData,
        hasCandidateCallbacks: !!candidateCallbacks
      });
      
      addLogEntry('AI', 'Starte erweiterte KI-Analyse mit Pipeline-Tracking...');
      
      // Validate API keys
      const validation = validateAPIKeys(addLogEntry);
      if (!validation.isValid) {
        return;
      }

      // Extract portfolio data with fallbacks
      const { portfolioValue, availableUSDT } = extractPortfolioData(simulationState, livePortfolioData);
      
      if (!portfolioValue || !availableUSDT) {
        loggingService.logError('Portfolio data extraction failed', {
          portfolioValue,
          availableUSDT,
          simulationState,
          livePortfolioData
        });
        addLogEntry('ERROR', 'Portfolio-Daten nicht verfügbar für KI-Analyse');
        return;
      }

      loggingService.logSuccess('Portfolio data successfully extracted for AI analysis', {
        portfolioValue,
        availableUSDT,
        dataSource: simulationState?.currentPortfolioValue ? 'simulation' : 'live_portfolio'
      });

      // Create candidate status callback for real-time updates
      const candidateStatusCallback = (symbol: string, status: string) => {
        if (candidateCallbacks) {
          candidateCallbacks.updateCandidateStatus(symbol, status as CandidateStatus);
        }
        console.log('🔄 Callback: Updated candidate status:', { symbol, status });
      };

      // Create enhanced AI service with candidate callback
      const selectedModelId = settings.model.id;
      const aiService = new EnhancedAISignalService({
        kucoinCredentials: {
          kucoinApiKey: validation.kucoinKeys!.key,
          kucoinApiSecret: validation.kucoinKeys!.secret,
          kucoinApiPassphrase: validation.kucoinKeys!.passphrase
        },
        openRouterApiKey: validation.openRouterApiKey!,
        strategy: validation.strategy!,
        simulatedPortfolioValue: portfolioValue,
        availableUSDT: availableUSDT,
        selectedModelId: selectedModelId
      });

      // Stage 1: Enhanced Market Screening with candidate tracking
      addLogEntry('AI', 'Phase 1: Market-Screening startet...');
      const selectedPairs = await aiService.performMarketScreening();
      
      // Add all selected pairs as candidates immediately using callbacks
      selectedPairs.forEach(pair => {
        if (candidateCallbacks) {
          candidateCallbacks.addCandidate(pair, 'screening_stage1_pending');
        }
        addLogEntry('AI', `Asset hinzugefügt: ${pair}`);
      });
      
      addLogEntry('AI', `${selectedPairs.length} Assets für Detailanalyse ausgewählt`);
      
      // Stage 2: Enhanced detailed signal generation with real-time status updates
      const signals: any[] = [];
      
      for (let i = 0; i < selectedPairs.length; i++) {
        const pair = selectedPairs[i];
        
        // Update to data loading phase using callbacks
        if (candidateCallbacks) {
          candidateCallbacks.advanceCandidateToNextStage(pair, 'detail_analysis_pending');
        }
        addLogEntry('AI', `Lade Daten für ${pair} (${i + 1}/${selectedPairs.length})...`);
        
        try {
          // Update to analysis running phase using callbacks
          if (candidateCallbacks) {
            candidateCallbacks.advanceCandidateToNextStage(pair, 'detail_analysis_running');
          }
          addLogEntry('AI', `KI-Detailanalyse für ${pair}...`);
          
          // Generate signal with candidate status callback
          const signal = await aiService.generateDetailedSignalWithCallback(pair, candidateStatusCallback);
          
          if (signal) {
            signals.push(signal);
            
            // Update candidate with signal information using callbacks
            if (candidateCallbacks) {
              candidateCallbacks.updateCandidateStatus(
                pair, 
                'signal_generated', 
                signal.signalType as 'BUY' | 'SELL' | 'HOLD',
                signal.confidenceScore
              );
            }
            
            addLogEntry('AI', `Signal generiert: ${signal.signalType} ${pair} (${Math.round((signal.confidenceScore || 0) * 100)}%)`);
            
            loggingService.logEvent('AI', 'Signal generated for pair with candidate tracking', {
              pair,
              signalType: signal.signalType,
              confidence: signal.confidenceScore
            });
          } else {
            // Keep as analyzed if no signal generated using callbacks
            if (candidateCallbacks) {
              candidateCallbacks.updateCandidateStatus(pair, 'analyzed');
            }
            addLogEntry('AI', `Kein handelbares Signal für ${pair}`);
          }
        } catch (error) {
          if (candidateCallbacks) {
            candidateCallbacks.updateCandidateStatus(pair, 'error_analysis', undefined, undefined, {
              errorReason: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          addLogEntry('WARNING', `Analyse fehlgeschlagen für ${pair}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
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
      
      console.log('📊 Enhanced signal generation completed with callback integration:', {
        signalsGenerated: signals.length,
        actionableSignals: signals.filter(s => s.signalType === 'BUY' || s.signalType === 'SELL').length,
        candidatesProcessed: selectedPairs.length,
        hasCandidateCallbacks: !!candidateCallbacks
      });
      
      if (signals.length > 0) {
        // Filter for actionable signals only
        const actionableSignals = signals.filter(s => s.signalType === 'BUY' || s.signalType === 'SELL');
        
        if (actionableSignals.length > 0) {
          setAvailableSignals(actionableSignals);
          
          const primarySignal = actionableSignals[0];
          setCurrentSignal(primarySignal);
          
          addLogEntry('AI', `${actionableSignals.length} handelbare Signale verfügbar`);
          addLogEntry('AI', `Primär-Signal: ${primarySignal.signalType} ${primarySignal.assetPair}`);
          
          // Auto-execute the primary signal if executeAutoTrade is provided
          if (executeAutoTrade && updateSimulationState && simulationState) {
            addLogEntry('AUTO_TRADE', `Automatische Ausführung startet: ${primarySignal.signalType} ${primarySignal.assetPair}`);
            
            try {
              const success = await executeAutoTrade(primarySignal, simulationState, updateSimulationState, addLogEntry);
              
              if (success) {
                addLogEntry('SUCCESS', `Auto-Trade erfolgreich: ${primarySignal.signalType} ${primarySignal.assetPair}`);
                // Clear the current signal after successful execution
                setCurrentSignal(null);
              } else {
                addLogEntry('WARNING', `Auto-Trade fehlgeschlagen: ${primarySignal.assetPair}`);
              }
            } catch (error) {
              addLogEntry('ERROR', `Auto-Trade Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
            }
          }
          
          if (primarySignal.reasoning) {
            addLogEntry('AI', `KI-Begründung: ${primarySignal.reasoning}`);
          }
        } else {
          addLogEntry('INFO', 'Keine handelbaren Signale in diesem Zyklus');
          setAvailableSignals([]);
          setCurrentSignal(null);
        }
      } else {
        addLogEntry('INFO', 'Keine Signale generiert');
        setAvailableSignals([]);
        setCurrentSignal(null);
      }
      
    } catch (error) {
      console.error('❌ Enhanced AI signal generation error:', error);
      addLogEntry('ERROR', `KI-Service Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setAvailableSignals([]);
      setCurrentSignal(null);
    } finally {
      setIsFetchingSignals(false);
    }
  }, [validateAPIKeys, isFetchingSignals, extractPortfolioData, settings.model.id]);

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals,
    isFetchingSignals
  };
};
