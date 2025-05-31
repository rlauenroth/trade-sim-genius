
import { useState, useCallback } from 'react';
import { Candidate, CandidateStatus, PIPELINE_STEPS } from '@/types/candidate';
import { loggingService } from '@/services/loggingService';

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const updateCandidates = useCallback((newCandidates: Candidate[]) => {
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
        return prev;
      }
      return [...prev, newCandidate];
    });
    
    loggingService.logEvent('AI', 'CANDIDATE_ADDED', { 
      symbol, 
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus]
    });
  }, []);

  const clearCandidates = useCallback(() => {
    setCandidates([]);
    loggingService.logEvent('AI', 'CANDIDATES_CLEARED', {});
  }, []);

  // Enhanced function for pipeline progress tracking
  const advanceCandidateToNextStage = useCallback((symbol: string, nextStatus: CandidateStatus, meta?: any) => {
    updateCandidateStatus(symbol, nextStatus, undefined, undefined, meta);
    
    loggingService.logEvent('AI', 'CANDIDATE_PIPELINE_ADVANCE', {
      symbol,
      nextStatus,
      pipelineStep: PIPELINE_STEPS[nextStatus],
      meta
    });
  }, [updateCandidateStatus]);

  return {
    candidates,
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates,
    advanceCandidateToNextStage
  };
};
