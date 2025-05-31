
import { useState, useCallback } from 'react';
import { Candidate, CandidateStatus, PIPELINE_STEPS } from '@/types/candidate';
import { loggingService } from '@/services/loggingService';

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const updateCandidates = useCallback((newCandidates: Candidate[]) => {
    console.log('🔄 useCandidates: CENTRAL UPDATE - Updating candidates list:', {
      count: newCandidates.length,
      candidates: newCandidates.map(c => ({ symbol: c.symbol, status: c.status })),
      timestamp: Date.now()
    });
    
    loggingService.logEvent('AI', 'CENTRAL_CANDIDATES_UPDATE', { 
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
    console.log('🔄 useCandidates: CENTRAL STATUS UPDATE - Updating candidate status:', {
      symbol,
      oldStatus: candidates.find(c => c.symbol === symbol)?.status || 'not_found',
      newStatus: status,
      signalType,
      confidence,
      pipelineStep: PIPELINE_STEPS[status],
      timestamp: Date.now(),
      callStack: new Error().stack?.split('\n').slice(1, 4).map(line => line.trim())
    });

    setCandidates(prev => {
      const existingIndex = prev.findIndex(c => c.symbol === symbol);
      
      if (existingIndex === -1) {
        console.log('🚨 useCandidates: Candidate not found for status update, adding new one:', symbol);
        const newCandidate: Candidate = {
          symbol,
          status,
          signalType,
          confidence,
          timestamp: Date.now(),
          lastStatusUpdate: Date.now(),
          pipelineStep: PIPELINE_STEPS[status] ?? 0,
          ...additionalData
        };
        const updated = [...prev, newCandidate];
        console.log('🔄 useCandidates: Added new candidate, total count:', updated.length);
        return updated;
      }
      
      const updated = prev.map((candidate, index) => 
        index === existingIndex 
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
      
      console.log('🔄 useCandidates: Updated existing candidate, current state:', {
        totalCandidates: updated.length,
        updatedCandidate: updated[existingIndex],
        allCandidates: updated.map(c => ({ symbol: c.symbol, status: c.status }))
      });
      
      loggingService.logEvent('AI', 'CENTRAL_CANDIDATE_STATUS_UPDATE', {
        symbol,
        status,
        signalType,
        confidence,
        pipelineStep: PIPELINE_STEPS[status]
      });
      
      return updated;
    });
  }, [candidates]);

  const addCandidate = useCallback((symbol: string, initialStatus: CandidateStatus = 'screening') => {
    console.log('🔄 useCandidates: CENTRAL ADD - Adding new candidate:', {
      symbol,
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus],
      timestamp: Date.now(),
      callStack: new Error().stack?.split('\n').slice(1, 4).map(line => line.trim())
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
        console.log('🔄 useCandidates: Candidate already exists, updating status instead:', symbol);
        return prev.map(c => 
          c.symbol === symbol 
            ? { ...c, status: initialStatus, lastStatusUpdate: Date.now(), pipelineStep: PIPELINE_STEPS[initialStatus] ?? 0 }
            : c
        );
      }
      const updated = [...prev, newCandidate];
      console.log('🔄 useCandidates: Added candidate, new total:', {
        totalCandidates: updated.length,
        newSymbol: symbol,
        allCandidates: updated.map(c => ({ symbol: c.symbol, status: c.status }))
      });
      return updated;
    });
    
    loggingService.logEvent('AI', 'CENTRAL_CANDIDATE_ADDED', { 
      symbol, 
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus]
    });
  }, []);

  const clearCandidates = useCallback(() => {
    console.log('🔄 useCandidates: CENTRAL CLEAR - Clearing all candidates');
    setCandidates([]);
    loggingService.logEvent('AI', 'CENTRAL_CANDIDATES_CLEARED', {});
  }, []);

  const advanceCandidateToNextStage = useCallback((symbol: string, nextStatus: CandidateStatus, meta?: any) => {
    console.log('🔄 useCandidates: CENTRAL ADVANCE - Advancing candidate to next stage:', {
      symbol,
      nextStatus,
      pipelineStep: PIPELINE_STEPS[nextStatus],
      meta,
      timestamp: Date.now()
    });

    updateCandidateStatus(symbol, nextStatus, undefined, undefined, meta);
    
    loggingService.logEvent('AI', 'CENTRAL_CANDIDATE_PIPELINE_ADVANCE', {
      symbol,
      nextStatus,
      pipelineStep: PIPELINE_STEPS[nextStatus],
      meta
    });
  }, [updateCandidateStatus]);

  // Enhanced debug current state
  console.log('🔄 useCandidates CENTRAL STATE:', {
    candidatesCount: candidates.length,
    candidates: candidates.map(c => ({ 
      symbol: c.symbol, 
      status: c.status, 
      pipelineStep: c.pipelineStep,
      lastUpdate: c.lastStatusUpdate,
      age: c.lastStatusUpdate ? Date.now() - c.lastStatusUpdate : 'unknown'
    })),
    timestamp: Date.now()
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
