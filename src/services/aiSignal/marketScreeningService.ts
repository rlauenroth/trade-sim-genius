
// Market screening service
import { sendAIRequest, createScreeningPrompt, OpenRouterError } from '@/utils/openRouter';
import { getMarketTickers } from '@/utils/kucoinApi';
import { SignalGenerationParams, MarketDataPoint } from '@/types/aiSignal';
import { safeJsonParse } from '@/utils/aiResponseValidator';
import { AI_SIGNAL_CONFIG } from '@/config/aiSignalConfig';
import { loggingService } from '@/services/loggingService';

export class MarketScreeningService {
  private params: SignalGenerationParams;

  constructor(params: SignalGenerationParams) {
    this.params = params;
  }

  async performMarketScreening(): Promise<string[]> {
    loggingService.logEvent('AI', 'Starting comprehensive market screening', {
      topX: AI_SIGNAL_CONFIG.SCREENING_TOP_X,
      minVolume: AI_SIGNAL_CONFIG.SCREENING_MIN_VOLUME,
      strategy: this.params.strategy,
      selectedModel: this.params.selectedModelId
    });
    
    try {
      // Get market data from KuCoin
      const tickers = await getMarketTickers(this.params.kucoinCredentials);
      
      loggingService.logEvent('AI', 'Market data retrieved', {
        totalTickers: tickers.length
      });
      
      // Filter for USDT pairs and sort by volume
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('-USDT'))
        .filter(ticker => parseFloat(ticker.volValue) > AI_SIGNAL_CONFIG.SCREENING_MIN_VOLUME)
        .sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, AI_SIGNAL_CONFIG.SCREENING_TOP_X);
      
      loggingService.logEvent('AI', 'Market filtering completed', {
        filteredPairs: usdtPairs.length,
        topPairs: usdtPairs.slice(0, 5).map(t => t.symbol)
      });
      
      // Prepare data for AI screening
      const marketData: MarketDataPoint[] = usdtPairs.map(ticker => ({
        pair: ticker.symbol,
        price: parseFloat(ticker.last),
        change_24h: parseFloat(ticker.changeRate) * 100,
        volume_24h: parseFloat(ticker.volValue),
        high_24h: parseFloat(ticker.high),
        low_24h: parseFloat(ticker.low)
      }));
      
      // Send to AI for screening - now with selectedModelId
      const screeningPrompt = createScreeningPrompt(this.params.selectedModelId, this.params.strategy, marketData);
      
      loggingService.logEvent('AI', 'Sending screening request to OpenRouter', {
        pairsToAnalyze: marketData.length,
        strategy: this.params.strategy,
        selectedModel: this.params.selectedModelId
      });
      
      const aiResponse = await sendAIRequest(
        this.params.openRouterApiKey, 
        screeningPrompt,
        'screening'
      );
      
      loggingService.logEvent('AI', 'OpenRouter screening response received', {
        responseLength: aiResponse.length
      });
      
      // Parse AI response with validation
      const fallbackResponse = { 
        selected_pairs: usdtPairs.slice(0, 3).map(t => t.symbol)
      };
      const parsed = safeJsonParse(aiResponse, fallbackResponse);
      
      const selectedPairs = parsed.selected_pairs || fallbackResponse.selected_pairs;
      
      loggingService.logSuccess('Market screening completed', {
        selectedPairs,
        totalAnalyzed: marketData.length,
        aiRecommendations: selectedPairs.length
      });
      
      return selectedPairs;
      
    } catch (error) {
      loggingService.logError('Market screening failed', {
        error: error instanceof Error ? error.message : 'unknown',
        stage: 'screening'
      });
      
      if (error instanceof OpenRouterError && error.status === 401) {
        throw error; // Re-throw to let the main service handle demo mode
      }
      
      // Fallback to popular pairs
      const fallbackPairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
      loggingService.logEvent('AI', 'Using fallback pairs', {
        fallbackPairs,
        reason: 'screening_error'
      });
      
      return fallbackPairs;
    }
  }
}
