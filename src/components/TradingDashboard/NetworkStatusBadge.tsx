
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
    
    switch (badgeStatus) {
      case 'green':
        return {
          color: 'bg-green-600',
          icon: <Wifi className="h-3 w-3" />,
          text: 'Live',
          tooltip: 'Verbindung aktiv'
        };
      case 'yellow':
        return {
          color: 'bg-yellow-600',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Träge',
          tooltip: 'Letzter Call vor 30-60s'
        };
      case 'red':
        return {
          color: 'bg-red-600',
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          tooltip: status.lastError || 'Keine Verbindung'
        };
    }
  };

  const badgeInfo = getBadgeInfo();

  return (
    <Badge 
      className={`${badgeInfo.color} text-white text-xs`}
      title={badgeInfo.tooltip}
    >
      {badgeInfo.icon}
      <span className="ml-1">{badgeInfo.text}</span>
    </Badge>
  );
};
