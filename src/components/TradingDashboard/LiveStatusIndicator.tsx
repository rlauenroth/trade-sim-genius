
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiModeService } from '@/services/apiModeService';

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

  const getKucoinStatusInfo = () => {
    switch (apiStatus.kucoinMode) {
      case 'live':
        return { 
          color: 'bg-green-600', 
          icon: <CheckCircle className="h-3 w-3" />, 
          text: 'KuCoin Live',
          description: 'Alle Endpunkte live'
        };
      case 'hybrid':
        return { 
          color: 'bg-yellow-600', 
          icon: <Wifi className="h-3 w-3" />, 
          text: 'KuCoin Hybrid',
          description: 'Öffentliche Daten live, Private simuliert'
        };
      case 'mock':
        return { 
          color: 'bg-orange-600', 
          icon: <WifiOff className="h-3 w-3" />, 
          text: 'KuCoin Demo',
          description: 'Simulierte Daten (CORS-Limitation)'
        };
    }
  };

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

  const kucoinInfo = getKucoinStatusInfo();
  const openRouterInfo = getOpenRouterStatusInfo();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">API Status</div>
          <div className="flex space-x-2">
            <Badge className={`${kucoinInfo.color} text-white text-xs`}>
              {kucoinInfo.icon}
              <span className="ml-1">{kucoinInfo.text}</span>
            </Badge>
            <Badge className={`${openRouterInfo.color} text-white text-xs`}>
              {openRouterInfo.icon}
              <span className="ml-1">{openRouterInfo.text}</span>
            </Badge>
          </div>
        </div>
        
        {apiStatus.corsIssuesDetected && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-600/30 rounded px-2 py-1">
            💡 CORS-Beschränkungen erkannt. Für vollständige Live-API-Unterstützung verwenden Sie eine Server-basierte Lösung.
          </div>
        )}
        
        <div className="mt-2 text-xs text-slate-500">
          <div>{kucoinInfo.description}</div>
          <div>{openRouterInfo.description}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStatusIndicator;
