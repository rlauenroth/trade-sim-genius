
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Wifi, Activity, AlertCircle } from 'lucide-react';
import { useSimGuard } from '@/hooks/useSimGuard';
import { Button } from '@/components/ui/button';
import { simReadinessStore } from '@/stores/simReadinessStore';

const NetworkStatusSection = () => {
  const { state, reason, snapshotAge, portfolio, lastApiPing, retryCount } = useSimGuard();

  const getStateBadge = () => {
    switch (state) {
      case 'READY':
        return <Badge className="bg-green-600 text-white">BEREIT</Badge>;
      case 'FETCHING':
        return <Badge className="bg-blue-600 text-white">LÄDT</Badge>;
      case 'SIM_RUNNING':
        return <Badge className="bg-purple-600 text-white">AKTIV</Badge>;
      case 'UNSTABLE':
        return <Badge className="bg-red-600 text-white">INSTABIL</Badge>;
      case 'IDLE':
      default:
        return <Badge className="bg-gray-600 text-white">IDLE</Badge>;
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Nie';
    return new Date(timestamp).toLocaleTimeString('de-DE');
  };

  const getSnapshotStatus = () => {
    if (!portfolio) return 'Keine Daten';
    
    const ageSeconds = Math.floor(snapshotAge / 1000);
    if (ageSeconds < 30) return `Aktuell (${ageSeconds}s)`;
    if (ageSeconds <= 60) return `Alt (${ageSeconds}s)`;
    return `Veraltet (${ageSeconds}s)`;
  };

  const handleManualRefresh = () => {
    simReadinessStore.dispatch({ type: 'INIT' });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Netzwerkstatus</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System State */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">System Status</div>
          {getStateBadge()}
        </div>

        {/* Reason */}
        {reason && (
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm text-slate-400">Grund</div>
              <div className="text-sm text-yellow-300">{reason}</div>
            </div>
          </div>
        )}

        {/* API Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Letzter API-Ping</span>
          </div>
          <div className="text-sm text-white">{formatTime(lastApiPing)}</div>
        </div>

        {/* Snapshot Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Portfolio-Snapshot</span>
          </div>
          <div className="text-sm text-white">{getSnapshotStatus()}</div>
        </div>

        {/* Portfolio Value */}
        {portfolio && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Portfolio-Wert</div>
            <div className="text-sm text-white">${portfolio.totalValue.toLocaleString()}</div>
          </div>
        )}

        {/* Retry Count */}
        {retryCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Wiederholungsversuche</div>
            <div className="text-sm text-orange-300">{retryCount}</div>
          </div>
        )}

        {/* Manual Refresh Button */}
        <div className="pt-4 border-t border-slate-600">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={state === 'FETCHING'}
          >
            {state === 'FETCHING' ? 'Wird aktualisiert...' : 'Manuell aktualisieren'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkStatusSection;
