
import { useState, useCallback } from 'react';
import { RateLimitError, ProxyError, ApiError } from '@/utils/errors';
import { networkStatusService } from '@/services/networkStatusService';
import { toast } from '@/hooks/use-toast';

interface UseProxyApiOptions {
  onRateLimit?: (retryAfter: number) => void;
  onProxyError?: () => void;
}

export const useProxyApi = (options: UseProxyApiOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    errorContext?: string
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      networkStatusService.recordSuccessfulCall();
      return result;
    } catch (err) {
      console.error(`API call failed${errorContext ? ` (${errorContext})` : ''}:`, err);
      
      networkStatusService.recordError(err as Error);
      
      if (err instanceof RateLimitError) {
        setError('Rate Limit erreicht');
        options.onRateLimit?.(err.retryAfter);
        
        toast({
          title: "Rate Limit erreicht",
          description: `Nächster Versuch in ${err.retryAfter} Sekunden`,
          variant: "destructive"
        });
      } else if (err instanceof ProxyError) {
        setError('Proxy nicht erreichbar');
        options.onProxyError?.();
        
        toast({
          title: "Proxy-Fehler",
          description: "KuCoin-Proxy ist nicht erreichbar",
          variant: "destructive"
        });
      } else if (err instanceof ApiError) {
        setError(`API-Fehler: ${err.status}`);
        
        toast({
          title: "API-Fehler",
          description: `Fehler ${err.status}: ${err.message}`,
          variant: "destructive"
        });
      } else {
        setError('Unbekannter Fehler');
        
        toast({
          title: "Fehler",
          description: "Ein unbekannter Fehler ist aufgetreten",
          variant: "destructive"
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const retryWithBackoff = useCallback(async <T>(
    apiCall: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await executeApiCall(apiCall, `attempt ${attempt + 1}`);
      
      if (result !== null) {
        return result;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }, [executeApiCall]);

  return {
    isLoading,
    error,
    executeApiCall,
    retryWithBackoff
  };
};
