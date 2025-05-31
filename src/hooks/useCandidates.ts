
import { useState, useCallback } from 'react';
import { Candidate, CandidateStatus, PIPELINE_STEPS } from '@/types/candidate';
import { loggingService } from '@/services/loggingService';

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const updateCandidates = useCallback((newCandidates: Candidate[]) => {
    console.log('🔄 useCandidates: FIXED - CENTRAL UPDATE - Updating candidates list:', {
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
    console.log('🔄 useCandidates: FIXED - CENTRAL STATUS UPDATE - Updating candidate status:', {
      symbol,
      oldStatus: candidates.find(c => c.symbol === symbol)?.status || 'not_found',
      newStatus: status,
      signalType,
      confidence,
      pipelineStep: PIPELINE_STEPS[status],
      timestamp: Date.now(),
      hasAdditionalData: !!additionalData
    });

    setCandidates(prev => {
      const existingIndex = prev.findIndex(c => c.symbol === symbol);
      
      if (existingIndex === -1) {
        console.log('🚨 useCandidates: FIXED - Candidate not found for status update, adding new one:', symbol);
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
        console.log('🔄 useCandidates: FIXED - Added new candidate, total count:', updated.length);
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
      
      console.log('🔄 useCandidates: FIXED - Updated existing candidate, current state:', {
        totalCandidates: updated.length,
        updatedCandidate: updated[existingIndex],
        allCandidates: updated.map(c => ({ symbol: c.symbol, status: c.status, pipelineStep: c.pipelineStep }))
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
    console.log('🔄 useCandidates: FIXED - CENTRAL ADD - Adding new candidate:', {
      symbol,
      initialStatus,
      pipelineStep: PIPELINE_STEPS[initialStatus],
      timestamp: Date.now()
    });

    const newCandidate: Candidate = {
      symbol,
      status: initialStatus,
      timestamp: Date.now(),
      lastStatusUpdate: Date.now(),
      pipelineStep: PIPELINE_STEPS[initialStatus] ?? 0
    };
    
    setCandidates(prev => {
      // FIXED: Better duplicate handling
      const existingIndex = prev.findIndex(c => c.symbol === symbol);
      if (existingIndex !== -1) {
        console.log('🔄 useCandidates: FIXED - Candidate already exists, updating status instead:', symbol);
        return prev.map((c, index) => 
          index === existingIndex 
            ? { ...c, status: initialStatus, lastStatusUpdate: Date.now(), pipelineStep: PIPELINE_STEPS[initialStatus] ?? 0 }
            : c
        );
      }
      
      const updated = [...prev, newCandidate];
      console.log('🔄 useCandidates: FIXED - Added candidate, new total:', {
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
    console.log('🔄 useCandidates: FIXED - CENTRAL CLEAR - Clearing all candidates');
    setCandidates([]);
    loggingService.logEvent('AI', 'CENTRAL_CANDIDATES_CLEARED', {});
  }, []);

  const advanceCandidateToNextStage = useCallback((symbol: string, nextStatus: CandidateStatus, meta?: any) => {
    console.log('🔄 useCandidates: FIXED - CENTRAL ADVANCE - Advancing candidate to next stage:', {
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

  // FIXED: Enhanced debug current state with better information
  console.log('🔄 useCandidates: FIXED - CENTRAL STATE:', {
    candidatesCount: candidates.length,
    candidates: candidates.map(c => ({ 
      symbol: c.symbol, 
      status: c.status, 
      pipelineStep: c.pipelineStep,
      lastUpdate: c.lastStatusUpdate,
      age: c.lastStatusUpdate ? Date.now() - c.lastStatusUpdate : 'unknown',
      hasSignalType: !!c.signalType,
      confidence: c.confidence
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
