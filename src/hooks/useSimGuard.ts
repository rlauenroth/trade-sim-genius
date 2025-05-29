
import { useState, useEffect } from 'react';
import { simReadinessStore } from '@/stores/simReadinessStore';
import { SimReadinessStatus } from '@/types/simReadiness';

export function useSimGuard() {
  const [status, setStatus] = useState<SimReadinessStatus>(simReadinessStore.getStatus());

  useEffect(() => {
    const unsubscribe = simReadinessStore.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const canStart = status.state === 'READY';
  const isRunningBlocked = status.state === 'UNSTABLE';
  
  let reason = '';
  if (!canStart) {
    switch (status.state) {
      case 'IDLE':
        reason = 'System initializing...';
        break;
      case 'FETCHING':
        reason = 'Loading portfolio data...';
        break;
      case 'UNSTABLE':
        reason = status.reason || 'System unstable';
        break;
      case 'SIM_RUNNING':
        reason = 'Simulation already running';
        break;
      default:
        reason = 'System not ready';
    }
  }

  // Be more lenient with data age - only show unstable if data is very old (5+ minutes)
  const isDataTooOld = status.snapshotAge > 300000; // 5 minutes instead of 60 seconds

  return {
    canStart,
    isRunningBlocked: isRunningBlocked && isDataTooOld, // Only block if data is actually too old
    reason,
    snapshotAge: status.snapshotAge,
    state: status.state,
    portfolio: status.portfolio,
    lastApiPing: status.lastApiPing,
    retryCount: status.retryCount
  };
}
