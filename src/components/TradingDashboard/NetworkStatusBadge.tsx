
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { networkStatusService } from '@/services/networkStatusService';

export const NetworkStatusBadge = () => {
  const [status, setStatus] = useState(networkStatusService.getStatus());

  useEffect(() => {
    const unsubscribe = networkStatusService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const getBadgeInfo = () => {
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
          text: 'Live',
          tooltip: `✅ Verbindung aktiv\nLetzter API-Call: ${lastCallFormatted}\nErfolgreiche Calls: ${status.totalSuccessfulCalls}\n${status.lastApiCall ? `Letzter Endpunkt: ${status.lastApiCall}` : ''}`
        };
      case 'yellow':
        return {
          color: 'bg-yellow-600',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Träge',
          tooltip: `⚠️ Letzter Call vor ${Math.round(timeSinceLastCall / 1000)}s\nLetzter API-Call: ${lastCallFormatted}\n${status.lastApiCall ? `Letzter Endpunkt: ${status.lastApiCall}` : ''}`
        };
      case 'red':
        return {
          color: 'bg-red-600',
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          tooltip: `❌ ${status.lastError || 'Keine Verbindung'}\nLetzter erfolgreicher Call: ${lastCallFormatted}\nFehler-Calls: ${status.totalErrorCalls}`
        };
    }
  };

  const badgeInfo = getBadgeInfo();

  return (
    <Badge 
      className={`${badgeInfo.color} text-white text-xs cursor-help`}
      title={badgeInfo.tooltip}
    >
      {badgeInfo.icon}
      <span className="ml-1">{badgeInfo.text}</span>
    </Badge>
  );
};
