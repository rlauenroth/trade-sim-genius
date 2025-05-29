
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';
import { KUCOIN_PROXY_BASE } from '@/config';

export const useProxyVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: 'untested' });

  const verify = async (proxyUrl: string): Promise<boolean> => {
    // If no proxy URL provided, use the default and mark as successful
    const urlToTest = proxyUrl || KUCOIN_PROXY_BASE;
    
    if (!urlToTest) {
      setResult({ 
        status: 'success', 
        message: 'Standard-Proxy wird verwendet' 
      });
      return true;
    }

    setIsVerifying(true);
    const startTime = Date.now();

    try {
      // Test proxy connection with a simple health check
      const testUrl = `${urlToTest}/api/v1/timestamp`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        // Check if it's a valid KuCoin response
        if (data && (data.code === '200000' || data.data)) {
          setResult({ 
            status: 'success', 
            message: 'Proxy-Verbindung erfolgreich',
            latencyMs 
          });
          
          loggingService.logEvent('API', `Proxy verification successful (${latencyMs}ms)`);
          return true;
        } else {
          throw new Error('Proxy antwortet nicht mit gültigem KuCoin-Format');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `Proxy-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`Proxy verification failed: ${errorMessage}`);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verify,
    isVerifying,
    result,
    reset: () => setResult({ status: 'untested' })
  };
};
