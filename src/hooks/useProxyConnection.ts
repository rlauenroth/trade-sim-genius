
import { useState, useCallback } from 'react';
import { testProxyConnection } from '@/utils/kucoinProxyApi';
import { toast } from '@/hooks/use-toast';

export const useProxyConnection = () => {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  const testConnection = useCallback(async () => {
    setIsTestingProxy(true);
    
    try {
      const isConnected = await testProxyConnection();
      
      if (isConnected) {
        setProxyStatus('connected');
        toast({
          title: "Proxy-Verbindung erfolgreich",
          description: "KuCoin-Proxy ist erreichbar und funktionsfähig.",
        });
      } else {
        setProxyStatus('failed');
        toast({
          title: "Proxy-Verbindung fehlgeschlagen",
          description: "KuCoin-Proxy ist nicht erreichbar. Bitte überprüfen Sie Ihre Netzwerkverbindung.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Proxy connection test error:', error);
      setProxyStatus('failed');
      toast({
        title: "Proxy-Test fehlgeschlagen",
        description: "Unerwarteter Fehler beim Testen der Proxy-Verbindung.",
        variant: "destructive"
      });
    } finally {
      setIsTestingProxy(false);
    }
  }, []);

  return {
    isTestingProxy,
    proxyStatus,
    testConnection
  };
};
