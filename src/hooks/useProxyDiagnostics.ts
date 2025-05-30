
import { useState, useCallback } from 'react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { testProxyConnection } from '@/utils/kucoin/connection';
import { KUCOIN_PROXY_BASE } from '@/config';

interface ProxyDiagnosticResult {
  url: string;
  isReachable: boolean;
  latency?: number;
  error?: string;
}

export const useProxyDiagnostics = () => {
  const { settings } = useSettingsV2Store();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ProxyDiagnosticResult[]>([]);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setResults([]);

    const urlsToTest = [
      { name: 'Konfigurierte URL', url: settings.proxyUrl },
      { name: 'Standard-Proxy', url: KUCOIN_PROXY_BASE }
    ].filter(item => item.url); // Remove empty URLs

    const diagnosticResults: ProxyDiagnosticResult[] = [];

    for (const { name, url } of urlsToTest) {
      try {
        console.log(`🔍 Teste Proxy: ${name} (${url})`);
        const startTime = Date.now();
        
        const isReachable = await testProxyConnection(url);
        const latency = Date.now() - startTime;

        diagnosticResults.push({
          url: `${name}: ${url}`,
          isReachable,
          latency: isReachable ? latency : undefined
        });
      } catch (error) {
        diagnosticResults.push({
          url: `${name}: ${url}`,
          isReachable: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  }, [settings.proxyUrl]);

  const getCurrentProxyInfo = useCallback(() => {
    return {
      configuredUrl: settings.proxyUrl,
      isUsingDefault: !settings.proxyUrl,
      activeUrl: settings.proxyUrl || KUCOIN_PROXY_BASE
    };
  }, [settings.proxyUrl]);

  return {
    runDiagnostics,
    isRunning,
    results,
    getCurrentProxyInfo
  };
};
