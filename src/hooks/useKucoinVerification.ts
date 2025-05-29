
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';
import { kucoinFetch } from '@/utils/kucoinProxyApi';

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
      // Store temporary keys with correct field names for kucoinFetch (use 'secret' not 'apiSecret')
      const tempKeys = { 
        apiKey, 
        secret: apiSecret,  // Use 'secret' to match what getTempKeys() expects
        passphrase 
      };
      localStorage.setItem('temp_kucoin_keys', JSON.stringify(tempKeys));

      console.log('🔑 KuCoin verification: Stored temp keys with secret field');

      // Use the existing KuCoin infrastructure to test the connection
      const response = await kucoinFetch('/api/v1/timestamp');

      const latencyMs = Date.now() - startTime;

      if (response.code === '200000') {
        setResult({ 
          status: 'success', 
          message: 'KuCoin-Verbindung erfolgreich',
          latencyMs 
        });
        
        loggingService.logEvent('API', `KuCoin verification successful (${latencyMs}ms)`);
        
        // Clean up temp keys
        localStorage.removeItem('temp_kucoin_keys');
        return true;
      } else {
        throw new Error(`KuCoin API Fehler: ${response.code} - ${response.msg}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `KuCoin-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`KuCoin verification failed: ${errorMessage}`);
      
      // Clean up temp keys on error
      localStorage.removeItem('temp_kucoin_keys');
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
