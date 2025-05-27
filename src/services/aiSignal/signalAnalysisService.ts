
// Signal analysis service
import { sendAIRequest, createAnalysisPrompt, OpenRouterError } from '@/utils/openRouter';
import { getHistoricalCandles, getCurrentPrice } from '@/utils/kucoinApi';
import { calculateAllIndicators } from '@/utils/technicalIndicators';
import { SignalGenerationParams, GeneratedSignal, CandleData, DetailedMarketData, PortfolioData } from '@/types/aiSignal';
import { safeJsonParse } from '@/utils/aiResponseValidator';

export class SignalAnalysisService {
  private params: SignalGenerationParams;

  constructor(params: SignalGenerationParams) {
    this.params = params;
  }

  // Helper method to validate and cast signal type
  private validateSignalType(signalType: string): 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE' {
    const validTypes = ['BUY', 'SELL', 'HOLD', 'NO_TRADE'];
    const upperSignalType = signalType.toUpperCase();
    
    if (validTypes.includes(upperSignalType)) {
      return upperSignalType as 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
    }
    
    return 'NO_TRADE';
  }

  async generateDetailedSignal(assetPair: string): Promise<GeneratedSignal | null> {
    console.log(`🤖 Generating detailed signal for ${assetPair}...`);
    
    try {
      // Get historical data
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
        console.log(`⚠️ No candle data for ${assetPair}`);
        return null;
      }
      
      // Convert candle data for technical indicators
      const candleData: CandleData[] = candles.map(candle => ({
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume)
      }));
      
      // Calculate technical indicators
      const technicalIndicators = calculateAllIndicators(candleData);
      
      // Get current price
      const currentPrice = await getCurrentPrice(this.params.kucoinCredentials, assetPair);
      
      // Prepare data for AI analysis
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
      
      // Generate analysis prompt
      const analysisPrompt = createAnalysisPrompt(
        this.params.strategy,
        assetPair,
        marketData,
        technicalIndicators,
        portfolioData
      );
      
      // Send to AI for detailed analysis
      const aiResponse = await sendAIRequest(this.params.openRouterApiKey, analysisPrompt);
      
      console.log('Raw AI signal response:', aiResponse);
      
      // Parse AI response with validation and fallback
      const fallbackSignal = {
        asset_pair: assetPair,
        signal_type: 'NO_TRADE',
        entry_price_suggestion: 'MARKET',
        take_profit_price: 0,
        stop_loss_price: 0,
        confidence_score: 0,
        reasoning: 'AI response parsing failed, no trade recommended',
        suggested_position_size_percent: 0
      };
      
      const signal = safeJsonParse(aiResponse, fallbackSignal);
      
      console.log(`✅ Signal generated for ${assetPair}:`, signal.signal_type);
      
      return {
        assetPair: signal.asset_pair,
        signalType: this.validateSignalType(signal.signal_type),
        entryPriceSuggestion: signal.entry_price_suggestion,
        takeProfitPrice: signal.take_profit_price || 0,
        stopLossPrice: signal.stop_loss_price || 0,
        confidenceScore: signal.confidence_score,
        reasoning: signal.reasoning,
        suggestedPositionSizePercent: signal.suggested_position_size_percent,
        isDemoMode: false
      };
      
    } catch (error) {
      console.error(`❌ Signal generation failed for ${assetPair}:`, error);
      if (error instanceof OpenRouterError && error.status === 401) {
        throw error; // Re-throw to let the main service handle demo mode
      }
      return null;
    }
  }

  // Helper method to calculate price trend
  private calculatePriceTrend(candles: CandleData[]): number {
    if (candles.length < 2) return 0;
    
    const firstPrice = candles[0].close;
    const lastPrice = candles[candles.length - 1].close;
    
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }
}
