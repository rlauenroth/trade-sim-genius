
import { useMemo } from 'react';
import { AssetPipelineItem, AssetPipelineMonitorProps } from './types';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';
import { PIPELINE_STEPS, PIPELINE_STEP_LABELS } from '@/types/candidate';
import { getAssetCategory } from '@/config/aiSignalConfig';

export const useEnhancedPipelineData = ({ 
  candidates, 
  availableSignals, 
  isSimulationActive,
  openPositions = []
}: Pick<AssetPipelineMonitorProps, 'candidates' | 'availableSignals' | 'isSimulationActive' | 'openPositions'>) => {
  return useMemo((): AssetPipelineItem[] => {
    console.log('🔄 useEnhancedPipelineData: Processing pipeline data:', {
      candidatesInput: candidates?.length || 0,
      availableSignalsInput: availableSignals?.length || 0,
      openPositionsInput: openPositions?.length || 0,
      candidatesData: candidates?.map(c => ({ symbol: c.symbol, status: c.status, lastUpdate: c.lastStatusUpdate })) || [],
      availableSignalsData: availableSignals?.map(s => ({ assetPair: s.assetPair, signalType: s.signalType })) || [],
      timestamp: Date.now()
    });

    const items: AssetPipelineItem[] = [];
    const processedSymbols = new Set<string>();
    
    // Process available signals first (highest priority)
    if (availableSignals) {
      availableSignals.forEach(signal => {
        const pipelineStep = signal.signalType === 'NO_TRADE' ? 7 : 4;
        const errorState = candidateErrorManager.getErrorState(signal.assetPair);
        const isBlacklisted = candidateErrorManager.isBlacklisted(signal.assetPair);
        
        console.log('🔄 useEnhancedPipelineData: Processing available signal:', {
          assetPair: signal.assetPair,
          signalType: signal.signalType,
          isBlacklisted,
          pipelineStep
        });
        
        items.push({
          symbol: signal.assetPair,
          status: isBlacklisted ? 'blacklisted' : 'signal_generated',
          signalType: signal.signalType,
          confidenceScore: signal.confidenceScore,
          entryPriceSuggestion: signal.entryPriceSuggestion,
          takeProfitPrice: signal.takeProfitPrice,
          stopLossPrice: signal.stopLossPrice,
          reasoning: signal.reasoning,
          suggestedPositionSizePercent: signal.suggestedPositionSizePercent,
          lastUpdated: Date.now(),
          isAutoExecuting: isSimulationActive && (signal.signalType === 'BUY' || signal.signalType === 'SELL'),
          pipelineStep: isBlacklisted ? -1 : pipelineStep,
          statusDescription: getStatusDescription(isBlacklisted ? 'blacklisted' : 'signal_generated', signal.signalType),
          errorDetails: errorState ? {
            type: errorState.lastErrorType || 'unknown',
            message: `${errorState.consecutiveErrors} consecutive errors`,
            retryCount: errorState.consecutiveErrors,
            blacklistedUntil: errorState.blacklistedUntil
          } : undefined,
          category: getAssetCategory(signal.assetPair),
          isHealthy: !isBlacklisted && !errorState
        });
        
        processedSymbols.add(signal.assetPair);
      });
    }
    
    // Process open positions
    if (openPositions) {
      openPositions.forEach(position => {
        if (!processedSymbols.has(position.symbol)) {
          const errorState = candidateErrorManager.getErrorState(position.symbol);
          const isBlacklisted = candidateErrorManager.isBlacklisted(position.symbol);
          
          console.log('🔄 useEnhancedPipelineData: Processing open position:', {
            symbol: position.symbol,
            type: position.type,
            isBlacklisted
          });
          
          items.push({
            symbol: position.symbol,
            status: isBlacklisted ? 'blacklisted' : 'position_monitoring',
            signalType: position.type,
            lastUpdated: position.timestamp || Date.now(),
            pipelineStep: isBlacklisted ? -1 : 6,
            statusDescription: getStatusDescription(isBlacklisted ? 'blacklisted' : 'position_monitoring'),
            positionInfo: {
              type: position.type,
              entryPrice: position.entryPrice,
              currentPrice: position.currentPrice,
              pnl: position.pnl,
              pnlPercentage: position.pnlPercentage
            },
            errorDetails: errorState ? {
              type: errorState.lastErrorType || 'unknown',
              message: `${errorState.consecutiveErrors} consecutive errors`,
              retryCount: errorState.consecutiveErrors,
              blacklistedUntil: errorState.blacklistedUntil
            } : undefined,
            category: getAssetCategory(position.symbol),
            isHealthy: !isBlacklisted && !errorState
          });
          
          processedSymbols.add(position.symbol);
        }
      });
    }
    
    // Process remaining candidates with ENHANCED DEBUGGING
    if (candidates) {
      console.log('🔄 useEnhancedPipelineData: Processing candidates:', {
        totalCandidates: candidates.length,
        alreadyProcessedSymbols: Array.from(processedSymbols),
        candidateDetails: candidates.map(c => ({
          symbol: c.symbol,
          status: c.status,
          lastUpdate: c.lastStatusUpdate,
          pipelineStep: c.pipelineStep
        }))
      });

      candidates.forEach(candidate => {
        if (!processedSymbols.has(candidate.symbol)) {
          const errorState = candidateErrorManager.getErrorState(candidate.symbol);
          const isBlacklisted = candidateErrorManager.isBlacklisted(candidate.symbol);
          const effectiveStatus = isBlacklisted ? 'blacklisted' : candidate.status;
          
          console.log('🔄 useEnhancedPipelineData: Processing candidate:', {
            symbol: candidate.symbol,
            originalStatus: candidate.status,
            effectiveStatus,
            isBlacklisted,
            pipelineStep: PIPELINE_STEPS[candidate.status] ?? 0,
            lastUpdate: candidate.lastStatusUpdate
          });
          
          items.push({
            symbol: candidate.symbol,
            status: effectiveStatus,
            signalType: candidate.signalType,
            confidenceScore: candidate.confidence,
            lastUpdated: candidate.lastStatusUpdate || candidate.timestamp,
            pipelineStep: isBlacklisted ? -1 : (PIPELINE_STEPS[candidate.status] ?? 0),
            statusDescription: getStatusDescription(effectiveStatus, candidate.signalType),
            errorDetails: errorState ? {
              type: errorState.lastErrorType || 'unknown',
              message: `${errorState.consecutiveErrors} consecutive errors`,
              retryCount: errorState.consecutiveErrors,
              blacklistedUntil: errorState.blacklistedUntil
            } : undefined,
            category: getAssetCategory(candidate.symbol),
            isHealthy: !isBlacklisted && !errorState && effectiveStatus !== 'error_analysis'
          });
        } else {
          console.log('🔄 useEnhancedPipelineData: Skipping already processed candidate:', candidate.symbol);
        }
      });
    }
    
    // Sort by priority: errors first, then by pipeline step (desc), then by last updated (desc)
    const sortedItems = items.sort((a, b) => {
      // Errors and blacklisted first
      if (a.pipelineStep === -1 && b.pipelineStep !== -1) return -1;
      if (b.pipelineStep === -1 && a.pipelineStep !== -1) return 1;
      
      // Then by pipeline step (more advanced first)
      if (a.pipelineStep !== b.pipelineStep) {
        return b.pipelineStep - a.pipelineStep;
      }
      
      // Finally by last updated
      return b.lastUpdated - a.lastUpdated;
    });

    console.log('🔄 useEnhancedPipelineData: FINAL RESULT:', {
      totalItems: sortedItems.length,
      items: sortedItems.map(item => ({
        symbol: item.symbol,
        status: item.status,
        pipelineStep: item.pipelineStep,
        lastUpdated: item.lastUpdated
      })),
      emptyReason: sortedItems.length === 0 ? 'No candidates, signals, or positions to display' : null
    });

    return sortedItems;
  }, [candidates, availableSignals, isSimulationActive, openPositions]);
};

function getStatusDescription(status: string, signalType?: string): string {
  switch (status) {
    // Simplified statuses
    case 'screening':
      return 'Wird gescreent...';
    case 'analyzing':
      return 'KI-Analyse läuft...';
    case 'signal_ready':
      return `${signalType || 'Signal'} bereit`;
    case 'error':
      return 'Fehler bei der Analyse';
    case 'monitoring_position':
      return 'Position wird überwacht';
    
    // Legacy statuses
    case 'detected_market_scan':
      return 'Im Market-Scan erkannt';
    case 'screening_stage1_pending':
      return 'Wartet auf Stage 1 Screening...';
    case 'screening_stage1_running':
      return 'Stage 1 KI-Screening läuft...';
    case 'detail_analysis_pending':
      return 'Lade Kerzendaten für Detailanalyse...';
    case 'detail_analysis_running':
      return 'Stage 2 KI-Detailanalyse läuft...';
    case 'signal_generated':
      return `${signalType || 'Signal'} generiert`;
    case 'trade_execution_pending':
      return 'Trade wird ausgeführt...';
    case 'position_monitoring':
      return 'Position wird überwacht';
    case 'error_analysis':
      return 'Fehler bei der Analyse';
    case 'blacklisted':
      return 'Temporär ausgeschlossen';
    case 'completed':
      return 'Abgeschlossen';
    case 'analyzed':
      return 'Analysiert';
    case 'signal':
      return `${signalType || 'Signal'} verfügbar`;
    case 'exit-screening':
      return 'Exit-Screening';
    default:
      return 'Unbekannter Status';
  }
}
