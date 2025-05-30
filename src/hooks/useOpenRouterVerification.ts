
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { loggingService } from '@/services/loggingService';

export const useOpenRouterVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: 'untested' });

  const verify = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
      setResult({ 
        status: 'error', 
        message: 'OpenRouter API-Key ist erforderlich' 
      });
      return false;
    }

    setIsVerifying(true);
    const startTime = Date.now();

    try {
      // Use the available free model from our modelProviders.json
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KI Trading App'
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct', // Available free model
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        setResult({ 
          status: 'success', 
          message: 'OpenRouter-Verbindung erfolgreich',
          latencyMs 
        });
        
        loggingService.logEvent('API', `OpenRouter verification successful (${latencyMs}ms)`);
        return true;
      } else if (response.status === 401) {
        throw new Error('Ungültiger API-Key');
      } else if (response.status === 403) {
        throw new Error('API-Key-Limit erreicht - bitte verwenden Sie einen anderen Key oder warten Sie');
      } else if (response.status === 404) {
        throw new Error('Modell nicht verfügbar');
      } else if (response.status === 429) {
        throw new Error('Rate-Limit erreicht - bitte warten Sie einen Moment');
      } else {
        // Try to get more details from the response
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody.error?.message) {
            errorDetails = errorBody.error.message;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        throw new Error(errorDetails);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `OpenRouter-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`OpenRouter verification failed: ${errorMessage}`);
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
