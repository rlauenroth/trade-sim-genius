
// Utility for validating and sanitizing AI responses before JSON parsing

export interface ValidationResult {
  isValid: boolean;
  cleanedResponse?: string;
  error?: string;
}

export function validateAndCleanAIResponse(response: string): ValidationResult {
  if (!response || typeof response !== 'string') {
    return {
      isValid: false,
      error: 'Response is empty or not a string'
    };
  }

  // Remove control characters and non-printable characters
  let cleaned = response.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Check if it starts with a curly brace (JSON object)
  if (!cleaned.startsWith('{')) {
    // Try to find JSON within the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    } else {
      return {
        isValid: false,
        error: 'No valid JSON object found in response'
      };
    }
  }
  
  // Try to parse as JSON to validate
  try {
    JSON.parse(cleaned);
    return {
      isValid: true,
      cleanedResponse: cleaned
    };
  } catch (error) {
    return {
      isValid: false,
      error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function safeJsonParse<T = any>(response: string, fallback: T): T {
  const validation = validateAndCleanAIResponse(response);
  
  if (!validation.isValid) {
    console.warn('AI response validation failed:', validation.error);
    console.warn('Raw response:', response);
    return fallback;
  }
  
  try {
    return JSON.parse(validation.cleanedResponse!);
  } catch (error) {
    console.error('JSON parsing failed after validation:', error);
    return fallback;
  }
}
