
import { useState, useEffect, useRef } from 'react';
import { useCentralPortfolioService } from './useCentralPortfolioService';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { SimReadinessStatus } from '@/types/simReadiness';

export function useSimGuard() {
  const [status, setStatus] = useState<SimReadinessStatus>(simReadinessStore.getStatus());
  const { snapshot: centralSnapshot, isLoading: centralLoading, error: centralError } = useCentralPortfolioService();
  
  // Debouncing and loop prevention
  const autoCorrectionTriggered = useRef<boolean>(false);
  const lastAutoCorrectionTime = useRef<number>(0);
  const AUTO_CORRECTION_COOLDOWN = 5000; // 5 seconds

  useEffect(() => {
    const unsubscribe = simReadinessStore.subscribe(setStatus);
    return unsubscribe;
  }, []);

  // Enhanced logic using both simReadiness and central portfolio data
  const hasValidPortfolio = !!(centralSnapshot && centralSnapshot.totalValue > 0);
  
  // If central store is not loading and we have data, don't consider system as loading
  const isDataLoading = centralLoading || (status.state === 'FETCHING' && !centralSnapshot);
  
  const hasErrors = !!(centralError || (status.state === 'UNSTABLE' && status.reason));

  // Optimized auto-correction with debouncing and loop prevention
  useEffect(() => {
    const now = Date.now();
    const shouldAutoCorrect = hasValidPortfolio && 
                             (status.state === 'FETCHING' || status.state === 'IDLE') && 
                             !centralLoading &&
                             !autoCorrectionTriggered.current &&
                             (now - lastAutoCorrectionTime.current > AUTO_CORRECTION_COOLDOWN);

    if (shouldAutoCorrect) {
      console.log('🔄 SimGuard: Auto-correcting stuck state - triggering FETCH_SUCCESS (debounced)');
      autoCorrectionTriggered.current = true;
      lastAutoCorrectionTime.current = now;
      
      simReadinessStore.dispatch({ 
        type: 'FETCH_SUCCESS', 
        payload: centralSnapshot! 
      });

      // Reset the flag after cooldown
      setTimeout(() => {
        autoCorrectionTriggered.current = false;
      }, AUTO_CORRECTION_COOLDOWN);
    }
  }, [hasValidPortfolio, status.state, centralLoading, centralSnapshot]);

  // Enhanced canStart logic with better fallback
  const canStartBasic = hasValidPortfolio && !isDataLoading && !hasErrors;
  const canStartStrict = canStartBasic && status.state === 'READY';
  
  // Use fallback logic: if central store has data and no errors, allow start
  const canStart = canStartStrict || (hasValidPortfolio && !hasErrors && !centralLoading);
  
  // Determine if running is blocked (more lenient)
  const isRunningBlocked = isDataLoading || (hasErrors && !hasValidPortfolio);
  
  let reason = '';
  if (!canStart) {
    if (isDataLoading) {
      reason = 'Loading portfolio data...';
    } else if (!hasValidPortfolio) {
      reason = 'No valid portfolio data available';
    } else if (hasErrors) {
      reason = centralError || status.reason || 'System error';
    } else if (status.state === 'SIM_RUNNING') {
      reason = 'Simulation already running';
    } else if (status.state === 'IDLE') {
      reason = 'System initializing...';
    } else {
      reason = 'System not ready';
    }
  }

  // Reduced debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🛡️ SimGuard status:', {
      simReadinessState: status.state,
      hasValidPortfolio,
      canStart,
      reason
    });
  }

  return {
    canStart,
    isRunningBlocked,
    reason,
    snapshotAge: status.snapshotAge,
    state: status.state,
    portfolio: centralSnapshot || status.portfolio,
    lastApiPing: status.lastApiPing,
    retryCount: status.retryCount,
    // Reduced debug info
    debug: {
      simReadinessState: status.state,
      hasValidPortfolio,
      canStart
    }
  };
}
