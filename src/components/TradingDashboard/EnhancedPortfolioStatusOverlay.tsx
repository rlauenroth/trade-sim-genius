
import React from 'react';
import { AlertTriangle, Clock, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimGuard } from '@/hooks/useSimGuard';
import { simReadinessStore } from '@/stores/simReadinessStore';

const EnhancedPortfolioStatusOverlay = () => {
  const { state, reason, snapshotAge, portfolio } = useSimGuard();

  const handleRetry = () => {
    console.log('🔄 Manual retry triggered');
    simReadinessStore.forceRefresh();
  };

  const getDetailedStatus = () => {
    const detailedStatus = simReadinessStore.getDetailedStatus();
    console.log('📊 Detailed status:', detailedStatus);
  };

  // Only show overlay for FETCHING state
  if (state === 'FETCHING') {
    return (
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
        <div className="text-center space-y-4 max-w-md p-6">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
          <div className="text-white font-medium text-lg">Portfolio wird geladen...</div>
          <div className="text-slate-300 text-sm">
            Kontostände und Preise werden von KuCoin abgerufen
          </div>
          <div className="text-xs text-slate-400">
            Dies kann 5-15 Sekunden dauern
          </div>
          
          <div className="flex space-x-2 justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Erneut versuchen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={getDetailedStatus}
              className="text-slate-400 hover:bg-slate-800"
            >
              Debug-Info
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show overlay for UNSTABLE state ONLY if there's actually a serious problem
  if (state === 'UNSTABLE') {
    const ageMinutes = Math.floor(snapshotAge / 60000);
    const isDataTooOld = snapshotAge > 300000; // 5 minutes
    const hasTimeoutError = reason?.includes('timeout');
    const hasConnectionError = reason?.includes('unreachable') || reason?.includes('proxy');
    
    // Only show overlay for serious issues that block functionality
    if (!isDataTooOld && !hasTimeoutError && !hasConnectionError) {
      return null;
    }

    const getErrorIcon = () => {
      if (hasConnectionError) {
        return <WifiOff className="h-12 w-12 text-red-400 mx-auto" />;
      }
      if (hasTimeoutError) {
        return <Clock className="h-12 w-12 text-orange-400 mx-auto" />;
      }
      return <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />;
    };

    const getErrorTitle = () => {
      if (hasConnectionError) {
        return 'Verbindungsfehler';
      }
      if (hasTimeoutError) {
        return 'Zeitüberschreitung';
      }
      if (isDataTooOld) {
        return 'Veraltete Daten';
      }
      return 'Portfolio-Fehler';
    };

    const getErrorDescription = () => {
      if (hasConnectionError) {
        return 'KuCoin API ist nicht erreichbar. Prüfen Sie Ihre Internetverbindung oder Proxy-Einstellungen.';
      }
      if (hasTimeoutError) {
        return 'Das Laden der Portfolio-Daten hat zu lange gedauert. Dies kann bei langsamen Verbindungen auftreten.';
      }
      if (isDataTooOld) {
        return `Die Portfolio-Daten sind ${ageMinutes} Minuten alt und müssen aktualisiert werden.`;
      }
      return reason || 'Ein unbekannter Fehler ist aufgetreten.';
    };
    
    return (
      <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
        <div className="text-center space-y-4 max-w-md p-6">
          {getErrorIcon()}
          <div className="text-white font-medium text-lg">{getErrorTitle()}</div>
          <div className="text-red-100 text-sm leading-relaxed">
            {getErrorDescription()}
          </div>
          
          {snapshotAge > 0 && (
            <div className="flex items-center justify-center space-x-1 text-red-200 text-xs">
              <Clock className="h-3 w-3" />
              <span>Letzte Aktualisierung vor {ageMinutes} Min</span>
            </div>
          )}
          
          <div className="flex space-x-2 justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="border-red-600 text-red-200 hover:bg-red-900/50"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Erneut laden
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={getDetailedStatus}
              className="text-red-300 hover:bg-red-900/30"
            >
              Diagnose
            </Button>
          </div>
          
          <div className="text-xs text-red-300/70 bg-red-900/30 border border-red-600/30 rounded p-3 mt-4">
            <div className="font-medium mb-1">💡 Troubleshooting:</div>
            <ul className="text-left space-y-1">
              <li>• API-Schlüssel in Einstellungen prüfen</li>
              <li>• Proxy-URL validieren</li>
              <li>• Internetverbindung testen</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // For READY and SIM_RUNNING states, don't show any overlay
  return null;
};

export default EnhancedPortfolioStatusOverlay;
