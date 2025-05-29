
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';

export const useKucoinVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: 'untested' });

  const verify = async (apiKey: string, apiSecret: string, passphrase: string): Promise<boolean> => {
    if (!apiKey || !apiSecret || !passphrase) {
      setResult({ 
        status: 'error', 
        message: 'Alle KuCoin-Felder sind erforderlich' 
      });
      return false;
    }

    setIsVerifying(true);
    const startTime = Date.now();

    try {
      // Simple timestamp request to verify credentials
      const response = await fetch('/api/kucoin/timestamp', {
        method: 'GET',
        headers: {
          'KC-API-KEY': apiKey,
          'KC-API-SECRET': apiSecret,
          'KC-API-PASSPHRASE': passphrase,
          'Content-Type': 'application/json'
        }
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        if (data.code === '200000') {
          setResult({ 
            status: 'success', 
            message: 'KuCoin-Verbindung erfolgreich',
            latencyMs 
          });
          
          loggingService.logEvent('SETTINGS_VERIFY', `KuCoin verification successful (${latencyMs}ms)`);
          return true;
        }
      }

      throw new Error(`KuCoin API Fehler: ${response.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `KuCoin-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`KuCoin verification failed: ${errorMessage}`);
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
