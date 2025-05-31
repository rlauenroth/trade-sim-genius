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
      // IMMEDIATE CLEAR: Clear candidates at start of new cycle using callback
      if (candidateCallbacks) {
        console.log('🚀 useSignalGeneration: CLEARING candidates via callback at cycle start');
        candidateCallbacks.clearCandidates();
      }
      
      console.log('🚀 Starting AI market analysis with IMMEDIATE candidate tracking:', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets?.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0,
        hasAutoExecution: !!executeAutoTrade,
        hasLivePortfolioFallback: !!livePortfolioData,
        hasCandidateCallbacks: !!candidateCallbacks,
        candidateCallbackKeys: candidateCallbacks ? Object.keys(candidateCallbacks) : []
      });
      
      addLogEntry('AI', 'Starte KI-Analyse mit sofortiger Kandidaten-Verfolgung...');
      
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

      // Create enhanced AI service
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

      // Stage 1: Enhanced Market Screening with IMMEDIATE candidate tracking
      addLogEntry('AI', 'Phase 1: Market-Screening startet...');
      console.log('🔄 useSignalGeneration: PERFORMING market screening...');
      
      const selectedPairs = await aiService.performMarketScreening();
      
      console.log('🔄 useSignalGeneration: Market screening completed, selected pairs:', selectedPairs);
      
      // CRITICAL: Add all selected pairs as candidates IMMEDIATELY using callbacks
      if (candidateCallbacks && selectedPairs.length > 0) {
        console.log('🚀 useSignalGeneration: IMMEDIATELY adding ALL screened pairs as candidates');
        selectedPairs.forEach((pair, index) => {
          console.log(`🔄 useSignalGeneration: ADDING candidate ${index + 1}/${selectedPairs.length} via callback:`, pair);
          candidateCallbacks.addCandidate(pair, 'screening');
          addLogEntry('AI', `Asset hinzugefügt: ${pair}`);
        });
        console.log('🔄 useSignalGeneration: ALL candidates added to central store');
      } else {
        console.log('🚨 useSignalGeneration: NO CANDIDATES ADDED - missing callbacks or no pairs:', {
          hasCallbacks: !!candidateCallbacks,
          pairsCount: selectedPairs.length
        });
      }
      
      addLogEntry('AI', `${selectedPairs.length} Assets für Detailanalyse ausgewählt`);
      
      // Stage 2: Enhanced detailed signal generation with REAL-TIME status updates
      const signals: any[] = [];
      
      for (let i = 0; i < selectedPairs.length; i++) {
        const pair = selectedPairs[i];
        
        // IMMEDIATE UPDATE: Set to analyzing phase before starting analysis
        if (candidateCallbacks) {
          console.log(`🔄 useSignalGeneration: UPDATING ${pair} to ANALYZING status BEFORE analysis starts`);
          candidateCallbacks.updateCandidateStatus(pair, 'analyzing');
        }
        addLogEntry('AI', `Detailanalyse startet für ${pair} (${i + 1}/${selectedPairs.length})...`);
        
        try {
          console.log(`🔄 useSignalGeneration: STARTING AI analysis for: ${pair}`);
          
          // Generate signal for this specific pair
          const signal = await aiService.generateDetailedSignal(pair);
          
          if (signal) {
            signals.push(signal);
            
            // IMMEDIATE UPDATE: Update candidate with signal information
            if (candidateCallbacks) {
              console.log(`🔄 useSignalGeneration: UPDATING ${pair} to SIGNAL_READY with result:`, signal.signalType);
              candidateCallbacks.updateCandidateStatus(
                pair, 
                'signal_ready', 
                signal.signalType as 'BUY' | 'SELL' | 'HOLD',
                signal.confidenceScore
              );
            }
            
            addLogEntry('AI', `Signal generiert: ${signal.signalType} ${pair} (${Math.round((signal.confidenceScore || 0) * 100)}%)`);
            
            loggingService.logEvent('AI', 'Signal generated for pair with immediate candidate tracking', {
              pair,
              signalType: signal.signalType,
              confidence: signal.confidenceScore
            });
          } else {
            // Keep as analyzed if no signal generated
            if (candidateCallbacks) {
              console.log(`🔄 useSignalGeneration: NO SIGNAL for ${pair}, keeping as analyzed`);
              candidateCallbacks.updateCandidateStatus(pair, 'analyzing');
            }
            addLogEntry('AI', `Kein handelbares Signal für ${pair}`);
          }
        } catch (error) {
          if (candidateCallbacks) {
            console.log(`🔄 useSignalGeneration: ERROR for ${pair}, updating status to error:`, error);
            candidateCallbacks.updateCandidateStatus(pair, 'error', undefined, undefined, {
              errorReason: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          addLogEntry('WARNING', `Analyse fehlgeschlagen für ${pair}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
        }
        
        // Rate limiting delay
        if (i < selectedPairs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('📊 Signal generation completed with immediate candidate tracking:', {
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
      console.error('❌ AI signal generation error:', error);
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
