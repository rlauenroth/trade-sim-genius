
// OpenRouter API client functionality
import { OpenRouterRequest, OpenRouterResponse, OpenRouterError } from '@/types/openRouter';
import { OPENROUTER_BASE_URL, API_HEADERS } from './config';
import { loggingService } from '@/services/loggingService';

// Test API key validity
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    loggingService.logEvent('API', 'Testing OpenRouter API key', {
      endpoint: '/models',
      hasApiKey: !!apiKey
    });
    
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...API_HEADERS
      }
    });
    
    const isValid = response.ok;
    
    if (isValid) {
      loggingService.logSuccess('OpenRouter API key test successful', {
        status: response.status
      });
    } else {
      loggingService.logError('OpenRouter API key test failed', {
        status: response.status,
        statusText: response.statusText
      });
    }
    
    return isValid;
  } catch (error) {
    loggingService.logError('OpenRouter API key test error', {
      error: error instanceof Error ? error.message : 'unknown'
    });
    return false;
  }
}

// Send request to OpenRouter AI with improved error handling and logging
export async function sendAIRequest(
  apiKey: string,
  request: OpenRouterRequest,
  requestType: 'screening' | 'detail' = 'detail',
  assetPair?: string
): Promise<string> {
  const startTime = Date.now();
  
  loggingService.logEvent('API', `CALL POST /chat/completions (${requestType})`, {
    model: request.model,
    requestType,
    assetPair,
    messageCount: request.messages.length,
    temperature: request.temperature
  });
  
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...API_HEADERS
      },
      body: JSON.stringify(request)
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      loggingService.logError(`OpenRouter API error ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        duration,
        requestType,
        assetPair
      });
      
      if (response.status === 401) {
        throw new OpenRouterError(401, 'Invalid or expired API key');
      } else if (response.status === 429) {
        throw new OpenRouterError(429, 'Rate limit exceeded');
      } else {
        throw new OpenRouterError(response.status, `OpenRouter API error: ${response.status} ${response.statusText}`);
      }
    }
    
    const data: OpenRouterResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    loggingService.logSuccess(`OpenRouter API success (${requestType})`, {
      status: response.status,
      duration,
      requestType,
      assetPair,
      responseLength: content.length,
      tokensUsed: data.usage?.total_tokens
    });
    
    return content;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    loggingService.logError(`OpenRouter API request failed (${requestType})`, {
      error: error instanceof Error ? error.message : 'unknown',
      duration,
      requestType,
      assetPair
    });
    
    throw error;
  }
}
