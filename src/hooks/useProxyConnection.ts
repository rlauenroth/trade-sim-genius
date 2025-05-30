
import { useState, useCallback } from 'react';
import { testProxyConnection } from '@/utils/kucoin/connection';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { toast } from '@/hooks/use-toast';

export const useProxyConnection = () => {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const { settings } = useSettingsV2Store();

  const testConnection = useCallback(async () => {
    setIsTestingProxy(true);
    
    try {
      const proxyUrl = settings.proxyUrl;
      console.log('🔍 Testing proxy connection to:', proxyUrl || 'default proxy');
      
      const isConnected = await testProxyConnection();
      
      if (isConnected) {
        setProxyStatus('connected');
        toast({
          title: "Proxy-Verbindung erfolgreich",
          description: `KuCoin-Proxy ist erreichbar${proxyUrl ? ` (${proxyUrl})` : ' (Standard-Proxy)'}.`,
        });
      } else {
        setProxyStatus('failed');
        toast({
          title: "Proxy-Verbindung fehlgeschlagen",
          description: `KuCoin-Proxy ist nicht erreichbar${proxyUrl ? ` (${proxyUrl})` : ' (Standard-Proxy)'}. Bitte überprüfen Sie Ihre Netzwerkverbindung.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Proxy connection test error:', error);
      setProxyStatus('failed');
      const proxyUrl = settings.proxyUrl;
      toast({
        title: "Proxy-Test fehlgeschlagen",
        description: `Unerwarteter Fehler beim Testen der Proxy-Verbindung${proxyUrl ? ` zu ${proxyUrl}` : ''}.`,
        variant: "destructive"
      });
    } finally {
      setIsTestingProxy(false);
    }
  }, [settings.proxyUrl]);

  return {
    isTestingProxy,
    proxyStatus,
    testConnection,
    currentProxyUrl: settings.proxyUrl || 'Standard-Proxy'
  };
};
