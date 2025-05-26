
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiModeService } from '@/services/apiModeService';
import { NetworkStatusBadge } from './NetworkStatusBadge';

const LiveStatusIndicator = () => {
  const [apiStatus, setApiStatus] = useState(apiModeService.getApiModeStatus());

  useEffect(() => {
    const checkStatus = () => {
      setApiStatus(apiModeService.getApiModeStatus());
    };

    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOpenRouterStatusInfo = () => {
    switch (apiStatus.openRouterMode) {
      case 'live':
        return { 
          color: 'bg-green-600', 
          icon: <CheckCircle className="h-3 w-3" />, 
          text: 'KI Live',
          description: 'Echte KI-Analyse'
        };
      case 'demo':
        return { 
          color: 'bg-blue-600', 
          icon: <AlertTriangle className="h-3 w-3" />, 
          text: 'KI Demo',
          description: 'Simulierte KI-Signale'
        };
    }
  };

  const openRouterInfo = getOpenRouterStatusInfo();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">API Status</div>
          <div className="flex space-x-2">
            <NetworkStatusBadge />
            <Badge className={`${openRouterInfo.color} text-white text-xs`}>
              {openRouterInfo.icon}
              <span className="ml-1">{openRouterInfo.text}</span>
            </Badge>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-slate-500">
          <div>KuCoin: Live-API via PHP-Proxy</div>
          <div>{openRouterInfo.description}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStatusIndicator;
