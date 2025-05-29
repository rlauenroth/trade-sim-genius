
import { useState, useCallback } from 'react';
import { Signal } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';
import { useAIValidation } from './useAIValidation';
import { useMarketScreening } from './useMarketScreening';
import { useCandidates } from '@/hooks/useCandidates';

export const useSignalGeneration = () => {
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [availableSignals, setAvailableSignals] = useState<Signal[]>([]);
  
  const { validateAPIKeys } = useAIValidation();
  const { performScreeningAndAnalysis } = useMarketScreening();
  const { clearCandidates } = useCandidates();

  const generateSignals = useCallback(async (
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
    
    clearCandidates();
    
    try {
      loggingService.logEvent('AI', 'Starting comprehensive AI market analysis', {
        portfolioValue: simulationState?.currentPortfolioValue,
        availableUSDT: simulationState?.paperAssets.find((asset: any) => asset.symbol === 'USDT')?.quantity,
        openPositions: simulationState?.openPositions?.length || 0
      });
      
      addLogEntry('AI', 'Starte umfassende KI-Marktanalyse...');
      
      // Validate API keys
      const validation = validateAPIKeys(addLogEntry);
      if (!validation.isValid) {
        return;
      }

      // Validate portfolio data
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

      // Perform market screening and signal generation
      const result = await performScreeningAndAnalysis({
        portfolioValue,
        availableUSDT,
        strategy: validation.strategy!,
        openRouterApiKey: validation.openRouterApiKey!,
        kucoinKeys: validation.kucoinKeys!
      }, addLogEntry);

      const { signals } = result;
      
      loggingService.logEvent('AI', 'Multi-signal generation completed', {
        signalsGenerated: signals.length,
        signalTypes: signals.map(s => s.signalType),
        assetPairs: signals.map(s => s.assetPair),
        avgConfidence: signals.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / signals.length
      });
      
      if (signals.length > 0) {
        setAvailableSignals(signals);
        
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
  }, [validateAPIKeys, performScreeningAndAnalysis, clearCandidates]);

  return {
    currentSignal,
    setCurrentSignal,
    availableSignals,
    setAvailableSignals,
    generateSignals
  };
};
