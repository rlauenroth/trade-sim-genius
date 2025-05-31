import { sendAIRequest, createAnalysisPrompt } from '@/utils/openRouter';
import { getHistoricalCandles, getCurrentPrice } from '@/utils/kucoinApi';
import { calculateAllIndicators } from '@/utils/technicalIndicators';
import { SignalGenerationParams, GeneratedSignal, CandleData, DetailedMarketData, PortfolioData } from '@/types/aiSignal';
import { AI_SIGNAL_CONFIG, getAssetCategory } from '@/config/aiSignalConfig';
import { FALLBACK_MODEL_ID } from '@/utils/openRouter/config';
import { loggingService } from '@/services/loggingService';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';
import { aiResponseValidator } from '@/services/aiErrorHandling/aiResponseValidator';
import { technicalRulesFallback } from '@/services/aiErrorHandling/technicalRulesFallback';
import { AITimeoutError, AIModelError } from '@/utils/errors/aiErrors';

export class EnhancedSignalAnalysisService {
  private params: SignalGenerationParams;
  private maxRetries = 3;
  private timeoutMs = 30000;
  private candidateStatusCallback?: (symbol: string, status: string) => void;

  constructor(params: SignalGenerationParams, candidateStatusCallback?: (symbol: string, status: string) => void) {
    this.params = params;
    this.candidateStatusCallback = candidateStatusCallback;
  }

  private updateCandidateStatus(symbol: string, status: string) {
    if (this.candidateStatusCallback) {
      this.candidateStatusCallback(symbol, status);
    }
  }

  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    const requestId = `detail_${assetPair}_${Date.now()}`;
    
    // Check if symbol is blacklisted
    if (candidateErrorManager.isBlacklisted(assetPair)) {
      this.updateCandidateStatus(assetPair, 'blacklisted');
      loggingService.logEvent('AI', 'Symbol is blacklisted, skipping', {
        assetPair,
        requestId
      });
      return null;
    }

    // Check if we can retry
    if (!candidateErrorManager.canRetry(assetPair)) {
      loggingService.logEvent('AI', 'Symbol in cooldown, skipping', {
        assetPair,
        requestId
      });
      return null;
    }

    this.updateCandidateStatus(assetPair, 'detail_analysis_pending');
    
    loggingService.logEvent('AI', 'Starting enhanced signal analysis', {
      assetPair,
      requestId,
      strategy: this.params.strategy,
      category: getAssetCategory(assetPair),
      selectedModel: this.params.selectedModelId
    });
    
    try {
      // Get market data with status update
      this.updateCandidateStatus(assetPair, 'detail_analysis_pending');
      const { candleData, currentPrice, technicalIndicators } = await this.getMarketData(assetPair);
      
      // Update to analysis running
      this.updateCandidateStatus(assetPair, 'detail_analysis_running');
      
      // Try AI analysis with retry logic
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const modelToUse = attempt === 1 ? this.params.selectedModelId : FALLBACK_MODEL_ID;
          
          if (attempt > 1) {
            loggingService.logEvent('AI', 'Using fallback model for analysis retry', {
              assetPair,
              requestId,
              attempt,
              fallbackModel: modelToUse,
              originalModel: this.params.selectedModelId
            });
          }
          
          const aiResponse = await this.performAIRequest(assetPair, candleData, currentPrice, technicalIndicators, attempt, requestId, modelToUse);
          const validation = aiResponseValidator.validateDetailedSignal(aiResponse, assetPair);
          
          if (validation.isValid) {
            candidateErrorManager.recordSuccess(assetPair);
            this.updateCandidateStatus(assetPair, 'signal_generated');
            return this.convertToGeneratedSignal(validation.data, false);
          } else if (validation.usedFallback) {
            candidateErrorManager.recordFallbackUsed();
            this.updateCandidateStatus(assetPair, 'signal_generated');
            return this.convertToGeneratedSignal(validation.data, true);
          }
        } catch (error) {
          await this.handleSignalError(error, assetPair, attempt, requestId);
          if (attempt === this.maxRetries) {
            break;
          }
        }
      }

      // Fallback to technical rules
      loggingService.logEvent('AI', 'Falling back to technical rules', {
        assetPair,
        requestId,
        reason: 'ai_analysis_failed'
      });
      
      candidateErrorManager.recordFallbackUsed();
      this.updateCandidateStatus(assetPair, 'signal_generated');
      const technicalSignal = technicalRulesFallback.generateTechnicalSignal(assetPair, candleData, currentPrice);
      return this.convertToGeneratedSignal(technicalSignal, true);
      
    } catch (error) {
      loggingService.logError('Signal analysis completely failed', {
        assetPair,
        requestId,
        error: error instanceof Error ? error.message : 'unknown'
      });
      
      candidateErrorManager.recordError(assetPair, 'SERVER_ERROR');
      this.updateCandidateStatus(assetPair, 'error_analysis');
      return null;
    }
  }

  private async getMarketData(assetPair: string) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60);
    
    const candles = await getHistoricalCandles(
      this.params.kucoinCredentials,
      assetPair,
      '5min',
      startTime,
      endTime
    );
    
    if (candles.length === 0) {
      throw new Error('No historical data available');
    }
    
    const candleData: CandleData[] = candles.map(candle => ({
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }));
    
    const technicalIndicators = calculateAllIndicators(candleData);
    const currentPrice = await getCurrentPrice(this.params.kucoinCredentials, assetPair);
    
    return { candleData, currentPrice, technicalIndicators };
  }

  private async performAIRequest(
    assetPair: string,
    candleData: CandleData[],
    currentPrice: number,
    technicalIndicators: any,
    attempt: number,
    requestId: string,
    modelId: string
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      loggingService.logEvent('AI', `AI analysis request attempt ${attempt}`, {
        assetPair,
        requestId,
        currentPrice,
        timeout: this.timeoutMs,
        modelId
      });

      const marketData: DetailedMarketData = {
        asset_pair: assetPair,
        current_price: currentPrice,
        recent_candles: candleData.slice(-20),
        price_trend_1h: this.calculatePriceTrend(candleData.slice(-12)),
        price_trend_4h: this.calculatePriceTrend(candleData.slice(-48)),
        volume_average: candleData.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20
      };

      const portfolioData: PortfolioData = {
        total_simulated_value_usdt: this.params.simulatedPortfolioValue,
        available_usdt: this.params.availableUSDT,
        strategy: this.params.strategy
      };

      const analysisPrompt = createAnalysisPrompt(
        modelId,
        this.params.strategy,
        assetPair,
        marketData,
        technicalIndicators,
        portfolioData
      );
      
      const response = await Promise.race([
        sendAIRequest(this.params.openRouterApiKey, analysisPrompt, 'detail', assetPair),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new AITimeoutError(this.timeoutMs, 'detail', assetPair));
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

  private calculatePriceTrend(candles: CandleData[]): number {
    if (candles.length < 2) return 0;
    const start = candles[0].close;
    const end = candles[candles.length - 1].close;
    return ((end - start) / start) * 100;
  }

  private async handleSignalError(error: unknown, assetPair: string, attempt: number, requestId: string): Promise<void> {
    let errorType: 'TIMEOUT' | 'AUTH_FAIL' | 'RATE_LIMIT' | 'SERVER_ERROR' | 'HALLUCINATION' = 'SERVER_ERROR';
    
    if (error instanceof AITimeoutError) {
      errorType = 'TIMEOUT';
    } else if (error instanceof AIModelError) {
      if (error.errorType === 'auth') errorType = 'AUTH_FAIL';
      else if (error.errorType === 'rate_limit') errorType = 'RATE_LIMIT';
    }

    candidateErrorManager.recordError(assetPair, errorType);
    this.updateCandidateStatus(assetPair, 'error_analysis');
    
    loggingService.logError(`Signal analysis attempt ${attempt} failed`, {
      assetPair,
      requestId,
      errorType,
      error: error instanceof Error ? error.message : 'unknown'
    });

    if (attempt < this.maxRetries) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private convertToGeneratedSignal(signal: any, isDemoMode: boolean): GeneratedSignal {
    return {
      assetPair: signal.asset_pair,
      signalType: this.validateSignalType(signal.signal_type),
      entryPriceSuggestion: signal.entry_price_suggestion,
      takeProfitPrice: signal.take_profit_price || 0,
      stopLossPrice: signal.stop_loss_price || 0,
      confidenceScore: signal.confidence_score,
      reasoning: signal.reasoning,
      suggestedPositionSizePercent: signal.suggested_position_size_percent,
      isDemoMode
    };
  }

  private validateSignalType(signalType: string): 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE' {
    const validTypes = ['BUY', 'SELL', 'HOLD', 'NO_TRADE'];
    const upperSignalType = signalType.toUpperCase();
    
    if (validTypes.includes(upperSignalType)) {
      return upperSignalType as 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
    }
    
    return 'NO_TRADE';
  }
}
