
import { useState, useCallback } from 'react';
import { Candidate, CandidateStatus, PIPELINE_STEPS } from '@/types/candidate';
import { loggingService } from '@/services/loggingService';

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const updateCandidates = useCallback((newCandidates: Candidate[]) => {
    console.log('🔄 useCandidates: Updating candidates list:', {
      count: newCandidates.length,
      candidates: newCandidates.map(c => ({ symbol: c.symbol, status: c.status }))
    });
    
    loggingService.logEvent('AI', 'UPDATE_CANDIDATES', { 
      count: newCandidates.length,
      candidates: newCandidates.map(c => ({ symbol: c.symbol, status: c.status }))
    });
    
    setCandidates(newCandidates);
  }, []);

  const updateCandidateStatus = useCallback((
    symbol: string, 
    status: CandidateStatus, 
    signalType?: Candidate['signalType'], 
    confidence?: number,
    additionalData?: Partial<Candidate>
  ) => {
    console.log('🔄 useCandidates: Updating candidate status:', {
      symbol,
      status,
      signalType,
      confidence,
      pipelineStep: PIPELINE_STEPS[status]
    });

    setCandidates(prev => {
      const updated = prev.map(candidate => 
        candidate.symbol === symbol 
          ? { 
              ...candidate,
              ...additionalData,
              status, 
              signalType, 
              confidence,
              timestamp: Date.now(),
              lastStatusUpdate: Date.now(),
              pipelineStep: PIPELINE_STEPS[status] ?? 0
            }
          : candidate
      );
      
      console.log('🔄 useCandidates: Updated candidates after status change:', {
        totalCandidates: updated.length,
        updatedSymbol: symbol,
        newStatus: status,
        allCandidates: updated.map(c => ({ symbol: c.symbol, status: c.status }))
      });
      
      loggingService.logEvent('AI', 'CANDIDATE_STATUS_UPDATE', {
        symbol,
        status,
        signalType,
        confidence,
        pipelineStep: PIPELINE_STEPS[status]
      });
      
      return updated;
    });
  }, []);

  const addCandidate = useCallback((symbol: string, initialStatus: CandidateStatus = 'detected_market_scan') => {
    console.log('🔄 useCandidates: Adding new candidate:', {
      symbol,
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus]
    });

    const newCandidate: Candidate = {
      symbol,
      status: initialStatus,
      timestamp: Date.now(),
      lastStatusUpdate: Date.now(),
      pipelineStep: PIPELINE_STEPS[initialStatus] ?? 0
    };
    
    setCandidates(prev => {
      // Avoid duplicates
      if (prev.some(c => c.symbol === symbol)) {
        console.log('🔄 useCandidates: Candidate already exists, skipping:', symbol);
        return prev;
      }
      const updated = [...prev, newCandidate];
      console.log('🔄 useCandidates: Added candidate, new total:', {
        totalCandidates: updated.length,
        newSymbol: symbol,
        allCandidates: updated.map(c => ({ symbol: c.symbol, status: c.status }))
      });
      return updated;
    });
    
    loggingService.logEvent('AI', 'CANDIDATE_ADDED', { 
      symbol, 
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus]
    });
  }, []);

  const clearCandidates = useCallback(() => {
    console.log('🔄 useCandidates: Clearing all candidates');
    setCandidates([]);
    loggingService.logEvent('AI', 'CANDIDATES_CLEARED', {});
  }, []);

  // Enhanced function for pipeline progress tracking
  const advanceCandidateToNextStage = useCallback((symbol: string, nextStatus: CandidateStatus, meta?: any) => {
    console.log('🔄 useCandidates: Advancing candidate to next stage:', {
      symbol,
      nextStatus,
      pipelineStep: PIPELINE_STEPS[nextStatus],
      meta
    });

    updateCandidateStatus(symbol, nextStatus, undefined, undefined, meta);
    
    loggingService.logEvent('AI', 'CANDIDATE_PIPELINE_ADVANCE', {
      symbol,
      nextStatus,
      pipelineStep: PIPELINE_STEPS[nextStatus],
      meta
    });
  }, [updateCandidateStatus]);

  // Debug current state
  console.log('🔄 useCandidates current state:', {
    candidatesCount: candidates.length,
    candidates: candidates.map(c => ({ 
      symbol: c.symbol, 
      status: c.status, 
      pipelineStep: c.pipelineStep,
      lastUpdate: c.lastStatusUpdate 
    }))
  });

  return {
    candidates,
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates,
    advanceCandidateToNextStage
  };
};
