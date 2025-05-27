
import { useState, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
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

  const updateCandidateStatus = useCallback((symbol: string, status: Candidate['status'], signalType?: Candidate['signalType'], confidence?: number) => {
    setCandidates(prev => {
      const updated = prev.map(candidate => 
        candidate.symbol === symbol 
          ? { 
              ...candidate, 
              status, 
              signalType, 
              confidence,
              timestamp: Date.now()
            }
          : candidate
      );
      
      loggingService.logEvent('AI', 'CANDIDATE_STATUS_UPDATE', {
        symbol,
        status,
        signalType,
        confidence
      });
      
      return updated;
    });
  }, []);

  const addCandidate = useCallback((symbol: string) => {
    const newCandidate: Candidate = {
      symbol,
      status: 'screening',
      timestamp: Date.now()
    };
    
    setCandidates(prev => {
      // Avoid duplicates
      if (prev.some(c => c.symbol === symbol)) {
        return prev;
      }
      return [...prev, newCandidate];
    });
    
    loggingService.logEvent('AI', 'CANDIDATE_ADDED', { symbol });
  }, []);

  const clearCandidates = useCallback(() => {
    setCandidates([]);
    loggingService.logEvent('AI', 'CANDIDATES_CLEARED', {});
  }, []);

  return {
    candidates,
    updateCandidates,
    updateCandidateStatus,
    addCandidate,
    clearCandidates
  };
};
