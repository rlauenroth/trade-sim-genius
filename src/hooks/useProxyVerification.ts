
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';
import { testProxyConnection } from '@/utils/kucoin/connection';
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
      console.log('🔍 Verifying proxy URL:', urlToTest);
      
      // Use the dynamic connection test function
      const isConnected = await testProxyConnection(urlToTest);
      const latencyMs = Date.now() - startTime;

      if (isConnected) {
        setResult({ 
          status: 'success', 
          message: `Proxy-Verbindung erfolgreich (${urlToTest})`,
          latencyMs 
        });
        
        loggingService.logEvent('API', `Proxy verification successful to ${urlToTest} (${latencyMs}ms)`);
        return true;
      } else {
        throw new Error(`Proxy ${urlToTest} ist nicht erreichbar oder antwortet nicht korrekt`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `Proxy-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`Proxy verification failed for ${urlToTest}: ${errorMessage}`);
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
