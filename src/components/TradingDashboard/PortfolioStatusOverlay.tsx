
import React from 'react';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useSimGuard } from '@/hooks/useSimGuard';

const PortfolioStatusOverlay = () => {
  const { state, reason, snapshotAge } = useSimGuard();

  if (state === 'FETCHING') {
    return (
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
          <div className="text-white font-medium">Portfolio-Daten werden aktualisiert...</div>
          <div className="text-slate-400 text-sm">Bitte warten...</div>
        </div>
      </div>
    );
  }

  // Only show unstable overlay if data is actually problematic (older than 5 minutes)
  const isDataTooOld = snapshotAge > 300000; // 5 minutes
  if (state === 'UNSTABLE' && isDataTooOld) {
    const ageMinutes = Math.floor(snapshotAge / 60000);
    
    return (
      <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
        <div className="text-center space-y-3 max-w-sm">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
          <div className="text-white font-medium">Live-Daten veraltet</div>
          <div className="text-red-200 text-sm">
            {reason}
          </div>
          {snapshotAge > 0 && (
            <div className="flex items-center justify-center space-x-1 text-red-300 text-xs">
              <Clock className="h-3 w-3" />
              <span>Letzte Aktualisierung vor {ageMinutes} Min</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PortfolioStatusOverlay;
