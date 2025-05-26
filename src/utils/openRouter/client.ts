
// OpenRouter API client functionality
import { OpenRouterRequest, OpenRouterResponse, OpenRouterError } from '@/types/openRouter';
import { OPENROUTER_BASE_URL, API_HEADERS } from './config';

// Test API key validity
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...API_HEADERS
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}

// Send request to OpenRouter AI with improved error handling
export async function sendAIRequest(
  apiKey: string,
  request: OpenRouterRequest
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...API_HEADERS
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new OpenRouterError(401, 'Invalid or expired API key');
    } else if (response.status === 429) {
      throw new OpenRouterError(429, 'Rate limit exceeded');
    } else {
      throw new OpenRouterError(response.status, `OpenRouter API error: ${response.status} ${response.statusText}`);
    }
  }
  
  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}
