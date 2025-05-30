
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
  const isRunningBlocked = status.state === 'UNSTABLE' || status.state === 'FETCHING';
  
  let reason = '';
  if (!canStart) {
    switch (status.state) {
      case 'IDLE':
        reason = 'System wird initialisiert...';
        break;
      case 'FETCHING':
        reason = 'Portfolio-Daten werden geladen...';
        break;
      case 'UNSTABLE':
        if (status.reason?.includes('Portfolio data expired')) {
          reason = 'Portfolio-Daten sind veraltet - wird aktualisiert...';
        } else if (status.reason?.includes('API')) {
          reason = 'KuCoin API nicht erreichbar - prüfen Sie Ihre Internetverbindung';
        } else if (status.reason?.includes('Invalid portfolio')) {
          reason = 'Portfolio-Daten ungültig - API-Schlüssel überprüfen';
        } else {
          reason = status.reason || 'System instabil - Portfolio wird neu geladen';
        }
        break;
      case 'SIM_RUNNING':
        reason = 'Simulation läuft bereits';
        break;
      default:
        reason = 'System nicht bereit - Portfolio-Daten werden geladen';
    }
  }

  // Be more lenient with data age - only show unstable if data is very old (5+ minutes)
  const isDataTooOld = status.snapshotAge > 300000; // 5 minutes instead of 60 seconds

  return {
    canStart,
    isRunningBlocked: isRunningBlocked && (status.state === 'FETCHING' || isDataTooOld),
    reason,
    snapshotAge: status.snapshotAge,
    state: status.state,
    portfolio: status.portfolio,
    lastApiPing: status.lastApiPing,
    retryCount: status.retryCount
  };
}
