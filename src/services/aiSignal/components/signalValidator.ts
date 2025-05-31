
import { loggingService } from '@/services/loggingService';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';

export class SignalValidator {
  async validateApiConfiguration(openRouterApiKey: string): Promise<boolean> {
    const { testApiKey } = await import('@/utils/openRouter');
    
    if (!openRouterApiKey || openRouterApiKey.trim() === '') {
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'missing_api_key'
      });
      return false;
    }

    const isValidKey = await testApiKey(openRouterApiKey);
    if (!isValidKey) {
      candidateErrorManager.recordError('api_validation', 'AUTH_FAIL');
      loggingService.logError('OpenRouter API key validation failed', {
        reason: 'invalid_api_key'
      });
      return false;
    }

    candidateErrorManager.recordSuccess('api_validation');
    loggingService.logSuccess('OpenRouter API configuration validated', {
      hasApiKey: true,
      keyValid: true
    });

    return true;
  }
}
