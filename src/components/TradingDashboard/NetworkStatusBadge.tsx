
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { networkStatusService } from '@/services/networkStatusService';
import { useSimGuard } from '@/hooks/useSimGuard';

export const NetworkStatusBadge = () => {
  const [status, setStatus] = useState(networkStatusService.getStatus());
  const { state, snapshotAge, portfolio } = useSimGuard();

  useEffect(() => {
    const unsubscribe = networkStatusService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const getApiBadgeInfo = () => {
    const badgeStatus = networkStatusService.getNetworkBadgeStatus();
    const timeSinceLastCall = Date.now() - status.lastSuccessfulCall;
    const lastCallFormatted = status.lastSuccessfulCall 
      ? new Date(status.lastSuccessfulCall).toLocaleTimeString('de-DE')
      : 'Nie';
    
    switch (badgeStatus) {
      case 'green':
        return {
          color: 'bg-green-600',
          icon: <Wifi className="h-3 w-3" />,
          text: 'API',
          tooltip: `✅ API erreichbar\nLetzter Call: ${lastCallFormatted}\nErfolgreiche Calls: ${status.totalSuccessfulCalls}`
        };
      case 'yellow':
        return {
          color: 'bg-yellow-600',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'API',
          tooltip: `⚠️ Letzter Call vor ${Math.round(timeSinceLastCall / 1000)}s\nLetzter Call: ${lastCallFormatted}`
        };
      case 'red':
        return {
          color: 'bg-red-600',
          icon: <WifiOff className="h-3 w-3" />,
          text: 'API',
          tooltip: `❌ ${status.lastError || 'Keine Verbindung'}\nLetzter erfolgreicher Call: ${lastCallFormatted}`
        };
    }
  };

  const getSnapshotBadgeInfo = () => {
    const ageSeconds = Math.floor(snapshotAge / 1000);
    
    if (!portfolio) {
      return {
        color: 'bg-gray-600',
        icon: <Clock className="h-3 w-3" />,
        text: 'No Data',
        tooltip: 'Keine Portfolio-Daten verfügbar'
      };
    }

    if (ageSeconds < 30) {
      return {
        color: 'bg-green-600',
        icon: <Clock className="h-3 w-3" />,
        text: `${ageSeconds}s`,
        tooltip: `✅ Portfolio-Daten aktuell (${ageSeconds}s alt)`
      };
    } else if (ageSeconds <= 60) {
      return {
        color: 'bg-yellow-600',
        icon: <Clock className="h-3 w-3" />,
        text: `${ageSeconds}s`,
        tooltip: `⚠️ Portfolio-Daten werden alt (${ageSeconds}s)`
      };
    } else {
      return {
        color: 'bg-red-600',
        icon: <Clock className="h-3 w-3" />,
        text: `${ageSeconds}s`,
        tooltip: `❌ Portfolio-Daten veraltet (${ageSeconds}s alt)`
      };
    }
  };

  const apiBadge = getApiBadgeInfo();
  const snapshotBadge = getSnapshotBadgeInfo();

  return (
    <div className="flex space-x-1">
      <Badge 
        className={`${apiBadge.color} text-white text-xs cursor-help`}
        title={apiBadge.tooltip}
      >
        {apiBadge.icon}
        <span className="ml-1">{apiBadge.text}</span>
      </Badge>
      
      <Badge 
        className={`${snapshotBadge.color} text-white text-xs cursor-help`}
        title={snapshotBadge.tooltip}
      >
        {snapshotBadge.icon}
        <span className="ml-1">{snapshotBadge.text}</span>
      </Badge>
    </div>
  );
};
