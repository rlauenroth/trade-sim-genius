
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';

export const useProxyVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: 'untested' });

  const verify = async (proxyUrl: string): Promise<boolean> => {
    if (!proxyUrl) {
      setResult({ 
        status: 'success', 
        message: 'Kein Proxy konfiguriert (optional)' 
      });
      return true;
    }

    setIsVerifying(true);
    const startTime = Date.now();

    try {
      const response = await fetch(proxyUrl, {
        method: 'HEAD',
        mode: 'cors'
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        setResult({ 
          status: 'success', 
          message: 'Proxy-Verbindung erfolgreich',
          latencyMs 
        });
        
        loggingService.logEvent('API', `Proxy verification successful (${latencyMs}ms)`);
        return true;
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
