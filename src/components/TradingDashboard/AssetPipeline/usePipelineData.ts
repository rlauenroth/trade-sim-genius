
import { useMemo } from 'react';
import { AssetPipelineItem, AssetPipelineMonitorProps } from './types';

export const usePipelineData = ({ 
  candidates, 
  availableSignals, 
  isSimulationActive 
}: Pick<AssetPipelineMonitorProps, 'candidates' | 'availableSignals' | 'isSimulationActive'>) => {
  return useMemo((): AssetPipelineItem[] => {
    const items: AssetPipelineItem[] = [];
    
    // Add all available signals
    availableSignals.forEach(signal => {
      items.push({
        symbol: signal.assetPair,
        status: 'signal',
        signalType: signal.signalType,
        confidenceScore: signal.confidenceScore,
        entryPriceSuggestion: signal.entryPriceSuggestion,
        takeProfitPrice: signal.takeProfitPrice,
        stopLossPrice: signal.stopLossPrice,
        reasoning: signal.reasoning,
        suggestedPositionSizePercent: signal.suggestedPositionSizePercent,
        lastUpdated: Date.now(),
        isAutoExecuting: isSimulationActive && (signal.signalType === 'BUY' || signal.signalType === 'SELL')
      });
    });
    
    // Add candidates that don't have signals yet
    candidates.forEach(candidate => {
      const hasSignal = availableSignals.some(signal => signal.assetPair === candidate.symbol);
      if (!hasSignal) {
        items.push({
          symbol: candidate.symbol,
          status: candidate.status,
          signalType: candidate.signalType,
          confidenceScore: candidate.confidence,
          lastUpdated: candidate.timestamp
        });
      }
    });
    
    // Sort by status priority and confidence
    return items.sort((a, b) => {
      const statusPriority = { signal: 0, analyzed: 1, screening: 2, 'exit-screening': 3, error: 4 };
      if (a.status !== b.status) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    });
  }, [candidates, availableSignals, isSimulationActive]);
};
