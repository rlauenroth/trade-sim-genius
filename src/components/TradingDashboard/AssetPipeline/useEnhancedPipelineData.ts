
import { useMemo } from 'react';
import { Candidate } from '@/types/candidate';

interface PipelineItem {
  symbol: string;
  status: string;
  signalType?: string;
  confidenceScore?: number;
  entryPriceSuggestion?: number;
  pipelineStep: number;
  statusDescription: string;
  category: string;
  isHealthy: boolean;
  lastUpdated: number;
}

interface UseEnhancedPipelineDataProps {
  candidates: Candidate[];
  availableSignals: any[];
  isSimulationActive: boolean;
  openPositions: any[];
}

export const useEnhancedPipelineData = ({ 
  candidates, 
  availableSignals, 
  isSimulationActive,
  openPositions 
}: UseEnhancedPipelineDataProps): PipelineItem[] => {
  
  console.log('🔄 useEnhancedPipelineData: ENHANCED Processing pipeline data:', {
    candidatesInput: candidates?.length || 0,
    availableSignalsInput: availableSignals?.length || 0,
    openPositionsInput: openPositions?.length || 0,
    candidatesData: candidates?.map(c => ({ symbol: c.symbol, status: c.status })) || [],
    availableSignalsData: availableSignals?.map(s => ({ assetPair: s.assetPair, signalType: s.signalType })) || [],
    timestamp: Date.now()
  });

  return useMemo(() => {
    const items: PipelineItem[] = [];

    // Process candidates first
    if (candidates && candidates.length > 0) {
      console.log('🔄 useEnhancedPipelineData: Processing candidates:', candidates.length);
      
      candidates.forEach(candidate => {
        const getStatusDescription = (status: string) => {
          switch (status) {
            case 'screening': return 'Markt-Screening läuft';
            case 'analyzing': return 'KI-Analyse aktiv';
            case 'signal_ready': return 'Signal bereit';
            case 'executed': return 'Trade ausgeführt';
            case 'error': return 'Fehler aufgetreten';
            default: return 'Verarbeitung läuft';
          }
        };

        const getCategory = (symbol: string) => {
          if (symbol.includes('BTC') || symbol.includes('ETH')) return 'major';
          return 'alt';
        };

        items.push({
          symbol: candidate.symbol,
          status: candidate.status,
          signalType: candidate.signalType,
          confidenceScore: candidate.confidence,
          entryPriceSuggestion: candidate.entryPriceSuggestion,
          pipelineStep: candidate.pipelineStep || 0,
          statusDescription: getStatusDescription(candidate.status),
          category: getCategory(candidate.symbol),
          isHealthy: candidate.status !== 'error',
          lastUpdated: candidate.lastStatusUpdate || Date.now()
        });
      });
    } else {
      console.log('🔄 useEnhancedPipelineData: NO CANDIDATES to process:', {
        candidatesUndefined: !candidates,
        candidatesEmpty: candidates?.length === 0
      });
    }

    // Process available signals if no candidates
    if (items.length === 0 && availableSignals && availableSignals.length > 0) {
      console.log('🔄 useEnhancedPipelineData: Processing available signals as fallback:', availableSignals.length);
      
      availableSignals.forEach(signal => {
        items.push({
          symbol: signal.assetPair,
          status: 'signal_ready',
          signalType: signal.signalType,
          confidenceScore: signal.confidenceScore,
          entryPriceSuggestion: signal.entryPriceSuggestion,
          pipelineStep: 4,
          statusDescription: `${signal.signalType} Signal verfügbar`,
          category: signal.assetPair.includes('BTC') || signal.assetPair.includes('ETH') ? 'major' : 'alt',
          isHealthy: true,
          lastUpdated: Date.now()
        });
      });
    }

    // Process open positions
    if (openPositions && openPositions.length > 0) {
      console.log('🔄 useEnhancedPipelineData: Processing open positions:', openPositions.length);
      
      openPositions.forEach(position => {
        items.push({
          symbol: position.assetPair,
          status: 'executed',
          signalType: position.type,
          pipelineStep: 5,
          statusDescription: 'Position aktiv',
          category: position.assetPair.includes('BTC') || position.assetPair.includes('ETH') ? 'major' : 'alt',
          isHealthy: true,
          lastUpdated: position.timestamp || Date.now()
        });
      });
    }

    // Sort by pipeline step and last updated
    items.sort((a, b) => {
      if (a.pipelineStep !== b.pipelineStep) {
        return b.pipelineStep - a.pipelineStep;
      }
      return b.lastUpdated - a.lastUpdated;
    });

    console.log('🔄 useEnhancedPipelineData: ENHANCED FINAL RESULT:', {
      totalItems: items.length,
      items: items.map(item => ({ 
        symbol: item.symbol, 
        status: item.status, 
        pipelineStep: item.pipelineStep 
      })),
      emptyReason: items.length === 0 ? 'No candidates, signals, or positions to display' : null
    });

    return items;
  }, [candidates, availableSignals, openPositions, isSimulationActive]);
};
