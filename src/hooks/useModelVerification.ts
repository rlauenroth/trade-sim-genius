
import { useState } from 'react';
import { VerificationResult } from '@/types/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import { loggingService } from '@/services/loggingService';

export const useModelVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: 'untested' });

  const verify = async (modelId: string, openRouterApiKey: string): Promise<boolean> => {
    if (!modelId || !openRouterApiKey) {
      setResult({ 
        status: 'error', 
        message: 'Modell-ID und OpenRouter-Key erforderlich' 
      });
      return false;
    }

    const provider = modelProviderService.getOptimalProvider(modelId);
    if (!provider) {
      setResult({ 
        status: 'error', 
        message: 'Kein Provider für dieses Modell gefunden' 
      });
      return false;
    }

    setIsVerifying(true);
    const startTime = Date.now();

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KI Trading App'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ 
            role: 'system', 
            content: 'latency-test' 
          }],
          max_tokens: 1
        })
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        // Update provider performance
        modelProviderService.updateProviderPerformance(modelId, provider.name, latencyMs);
        
        setResult({ 
          status: 'success', 
          message: `Modell-Test erfolgreich (${provider.name})`,
          latencyMs 
        });
        
        loggingService.logEvent('AI', `Model ${modelId} verification successful (${latencyMs}ms)`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setResult({ 
        status: 'error', 
        message: `Modell-Verifikation fehlgeschlagen: ${errorMessage}` 
      });
      
      loggingService.logError(`Model verification failed: ${errorMessage}`);
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
