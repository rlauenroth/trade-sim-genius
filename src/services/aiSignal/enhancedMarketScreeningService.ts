
import { sendAIRequest, createScreeningPrompt } from '@/utils/openRouter';
import { getMarketTickers } from '@/utils/kucoinApi';
import { SignalGenerationParams, MarketDataPoint } from '@/types/aiSignal';
import { AI_SIGNAL_CONFIG } from '@/config/aiSignalConfig';
import { FALLBACK_MODEL_ID } from '@/utils/openRouter/config';
import { loggingService } from '@/services/loggingService';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';
import { aiResponseValidator } from '@/services/aiErrorHandling/aiResponseValidator';
import { AITimeoutError, AIModelError } from '@/utils/errors/aiErrors';

export class EnhancedMarketScreeningService {
  private params: SignalGenerationParams;
  private maxRetries = 3;
  private timeoutMs = 30000;

  constructor(params: SignalGenerationParams) {
    this.params = params;
  }

  async performMarketScreening(): Promise<string[]> {
    const requestId = `screening_${Date.now()}`;
    
    loggingService.logEvent('AI', 'Starting enhanced market screening', {
      requestId,
      topX: AI_SIGNAL_CONFIG.SCREENING_TOP_X,
      minVolume: AI_SIGNAL_CONFIG.SCREENING_MIN_VOLUME,
      strategy: this.params.strategy,
      selectedModel: this.params.selectedModelId
    });
    
    try {
      // Get market data
      const tickers = await getMarketTickers(this.params.kucoinCredentials);
      
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('-USDT'))
        .filter(ticker => parseFloat(ticker.volValue) > AI_SIGNAL_CONFIG.SCREENING_MIN_VOLUME)
        .sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, AI_SIGNAL_CONFIG.SCREENING_TOP_X);
      
      const marketData: MarketDataPoint[] = usdtPairs.map(ticker => ({
        pair: ticker.symbol,
        price: parseFloat(ticker.last),
        change_24h: parseFloat(ticker.changeRate) * 100,
        volume_24h: parseFloat(ticker.volValue),
        high_24h: parseFloat(ticker.high),
        low_24h: parseFloat(ticker.low)
      }));

      const expectedSymbols = marketData.map(data => data.pair);
      
      // Try AI screening with retry logic
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const modelToUse = attempt === 1 ? this.params.selectedModelId : FALLBACK_MODEL_ID;
          
          if (attempt > 1) {
            loggingService.logEvent('AI', 'Using fallback model for retry', {
              requestId,
              attempt,
              fallbackModel: modelToUse,
              originalModel: this.params.selectedModelId
            });
          }
          
          const aiResponse = await this.performAIRequest(marketData, attempt, requestId, modelToUse);
          const validation = aiResponseValidator.validateScreeningResponse(aiResponse, expectedSymbols);
          
          if (validation.isValid) {
            candidateErrorManager.recordSuccess('screening');
            return validation.data.selected_pairs;
          } else {
            candidateErrorManager.recordError('screening', 'MALFORMED_JSON');
            if (validation.usedFallback) {
              candidateErrorManager.recordFallbackUsed();
              return validation.data.selected_pairs;
            }
          }
        } catch (error) {
          await this.handleScreeningError(error, attempt, requestId);
          if (attempt === this.maxRetries) {
            break;
          }
        }
      }

      // Final fallback to volume-based selection
      loggingService.logEvent('AI', 'Using volume-based fallback for screening', {
        requestId,
        reason: 'all_ai_attempts_failed'
      });
      
      candidateErrorManager.recordFallbackUsed();
      return this.getVolumeFallback(usdtPairs);
      
    } catch (error) {
      loggingService.logError('Market screening completely failed', {
        requestId,
        error: error instanceof Error ? error.message : 'unknown'
      });
      
      // Return static fallback pairs
      return ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
    }
  }

  private async performAIRequest(marketData: MarketDataPoint[], attempt: number, requestId: string, modelId: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      loggingService.logEvent('AI', `AI screening request attempt ${attempt}`, {
        requestId,
        pairsToAnalyze: marketData.length,
        timeout: this.timeoutMs,
        modelId
      });

      const screeningPrompt = createScreeningPrompt(modelId, this.params.strategy, marketData);
      
      const response = await Promise.race([
        sendAIRequest(this.params.openRouterApiKey, screeningPrompt, 'screening'),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new AITimeoutError(this.timeoutMs, 'screening'));
          });
        })
      ]);

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async handleScreeningError(error: unknown, attempt: number, requestId: string): Promise<void> {
    let errorType: 'TIMEOUT' | 'AUTH_FAIL' | 'RATE_LIMIT' | 'SERVER_ERROR' = 'SERVER_ERROR';
    
    if (error instanceof AITimeoutError) {
      errorType = 'TIMEOUT';
    } else if (error instanceof AIModelError) {
      if (error.errorType === 'auth') errorType = 'AUTH_FAIL';
      else if (error.errorType === 'rate_limit') errorType = 'RATE_LIMIT';
    }

    candidateErrorManager.recordError('screening', errorType);
    
    loggingService.logError(`Screening attempt ${attempt} failed`, {
      requestId,
      errorType,
      error: error instanceof Error ? error.message : 'unknown'
    });

    if (attempt < this.maxRetries) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private getVolumeFallback(tickers: any[]): string[] {
    const fallbackCount = Math.min(5, tickers.length);
    const selected = tickers.slice(0, fallbackCount).map(ticker => ticker.symbol);
    
    loggingService.logEvent('AI', 'Volume-based fallback selection', {
      selectedPairs: selected,
      reason: 'ai_screening_failed'
    });
    
    return selected;
  }
}
