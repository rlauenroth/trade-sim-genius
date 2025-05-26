
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

  return {
    canStart,
    isRunningBlocked,
    reason,
    snapshotAge: status.snapshotAge,
    state: status.state,
    portfolio: status.portfolio,
    lastApiPing: status.lastApiPing,
    retryCount: status.retryCount
  };
}
