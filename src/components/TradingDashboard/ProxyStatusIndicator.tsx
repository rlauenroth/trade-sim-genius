
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { testProxyConnection } from '@/utils/kucoin/connection';

const ProxyStatusIndicator = () => {
  const { settings } = useSettingsV2Store();
  const [proxyStatus, setProxyStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const checkProxyStatus = async () => {
    setIsChecking(true);
    try {
      const isConnected = await testProxyConnection();
      setProxyStatus(isConnected ? 'connected' : 'failed');
      setLastChecked(Date.now());
    } catch (error) {
      console.error('Proxy status check failed:', error);
      setProxyStatus('failed');
      setLastChecked(Date.now());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check proxy status on mount
    checkProxyStatus();
    
    // Check every 2 minutes
    const interval = setInterval(checkProxyStatus, 120000);
    return () => clearInterval(interval);
  }, [settings.proxyUrl]);

  const getStatusInfo = () => {
    switch (proxyStatus) {
      case 'connected':
        return {
          color: 'bg-green-600',
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Proxy Verbunden',
          description: 'KuCoin API erreichbar'
        };
      case 'failed':
        return {
          color: 'bg-red-600',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Proxy Fehler',
          description: 'KuCoin API nicht erreichbar'
        };
      default:
        return {
          color: 'bg-yellow-600',
          icon: <Wifi className="h-3 w-3" />,
          text: 'Proxy Prüfung...',
          description: 'Status wird ermittelt'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const currentProxyUrl = settings.proxyUrl || 'Standard-Proxy';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-400">Proxy Status</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={checkProxyStatus}
            disabled={isChecking}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <Badge className={`${statusInfo.color} text-white text-xs`}>
            {statusInfo.icon}
            <span className="ml-1">{statusInfo.text}</span>
          </Badge>
        </div>
        
        <div className="text-xs text-slate-500">
          <div>{statusInfo.description}</div>
          <div className="text-slate-600 mt-1">
            URL: {currentProxyUrl}
          </div>
          {lastChecked && (
            <div className="text-slate-600">
              Geprüft: {new Date(lastChecked).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProxyStatusIndicator;
